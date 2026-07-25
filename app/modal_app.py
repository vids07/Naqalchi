# app/modal_app.py
"""
Modal App definition for Naqalchi.
Allows downloading real model weights and offloading heavy GPU tasks
(CosyVoice and LivePortrait inference) to serverless cloud infrastructure in a single command.
"""

try:
    import modal
except ImportError:
    modal = None

if modal:
    import os

    # 1. Define persistent volume for model weights and checkpoints (caches downloads)
    weights_volume = modal.Volume.from_name("naqalchi-model-weights", create_if_missing=True)

    # 2. Define standard GPU image equipped with CUDA, PyTorch, and essential libraries
    image = (
        modal.Image.debian_slim(python_version="3.10")
        .apt_install("ffmpeg", "git")
        .pip_install(
            "torch", 
            "torchaudio", 
            "pydantic", 
            "pydantic-settings", 
            "fastapi", 
            "uvicorn",
            "huggingface_hub",
            "numpy",
            "opencv-python-headless"
        )
        .add_local_dir(os.path.dirname(__file__), remote_path="/root/app")
    )
    
    # Initialize the Modal App Stub (using App class in newer modal SDK versions)
    try:
        app = modal.App("naqalchi-pipeline")
    except AttributeError:
        # Fallback for older modal SDK versions using Stub
        app = modal.Stub("naqalchi-pipeline")
    
    # 3. Serverless weight downloader to pull real-world CosyVoice & LivePortrait checkpoints
    @app.function(image=image, volumes={"/root/weights": weights_volume}, timeout=1200)
    def download_weights():
        """Downloads official weights into the persistent cloud volume."""
        import os
        from huggingface_hub import snapshot_download

        print("[Modal Cloud] Initializing persistent model weight download...")
        
        # Download CosyVoice-300M (Voice cloning)
        cosy_path = "/root/weights/cosyvoice"
        if not os.path.exists(cosy_path) or len(os.listdir(cosy_path)) < 3:
            print("[Modal Cloud] Downloading CosyVoice-300M checkpoints...")
            snapshot_download(
                repo_id="FunAudioLLM/CosyVoice-300M",
                local_dir=cosy_path,
                ignore_patterns=["*.msgpack", "*.h5"]
            )
            print("[Modal Cloud] CosyVoice download complete.")
        else:
            print("[Modal Cloud] CosyVoice checkpoints already cached in Volume.")

        # Download LivePortrait (Avatar animation)
        lp_path = "/root/weights/liveportrait"
        if not os.path.exists(lp_path) or len(os.listdir(lp_path)) < 3:
            print("[Modal Cloud] Downloading LivePortrait checkpoints...")
            snapshot_download(
                repo_id="KwaiVGI/LivePortrait",
                local_dir=lp_path
            )
            print("[Modal Cloud] LivePortrait download complete.")
        else:
            print("[Modal Cloud] LivePortrait checkpoints already cached in Volume.")
            
        # Commit changes to the persistent cloud volume
        weights_volume.commit()
        print("[Modal Cloud] All model weights committed successfully to 'naqalchi-model-weights'!")
    # 4. Modal-wrapped serverless function for OmniVoice synthesis
    @app.function(image=image, cpu=2.0)
    def modal_generate_voice(text: str, voice_sample_bytes: bytes = None) -> bytes:
        from app.adapters.voice.omnivoice import OmniVoiceAdapter
        import tempfile
        
        adapter = OmniVoiceAdapter()
        
        if voice_sample_bytes:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                tmp.write(voice_sample_bytes)
                tmp.flush()
                voice_sample_path = tmp.name
        else:
            voice_sample_path = None
            
        audio_path = adapter.generate_voice(text, voice_sample_path)
        
        with open(audio_path, "rb") as f:
            return f.read()

    # 5. Modal-wrapped serverless function for DuixAvatar lip-sync (GPU accelerated)
    @app.function(
        image=image, 
        gpu="A10G", 
        timeout=600, 
        volumes={"/root/weights": weights_volume}
    )
    def modal_generate_avatar(audio_bytes: bytes, avatar_image_bytes: bytes) -> bytes:
        from app.adapters.face.duix_avatar import DuixAvatarAdapter
        import tempfile
        
        adapter = DuixAvatarAdapter()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as audio_tmp, \
             tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as img_tmp:
            
            audio_tmp.write(audio_bytes)
            audio_tmp.flush()
            
            img_tmp.write(avatar_image_bytes)
            img_tmp.flush()
            
            video_path = adapter.generate_avatar_video(audio_tmp.name, img_tmp.name)
            
        with open(video_path, "rb") as f:
            return f.read()

    # Define a default local entry point for testing
    @app.local_entrypoint()
    def main():
        print("[Modal Local] Triggering cloud models download function...")
        download_weights.remote()
        print("[Modal Local] Cloud run complete! Your remote volumes are fully prepared.")
else:
    app = None
    print("[Modal App] Modal SDK not installed. Cloud GPU offloading disabled.")
