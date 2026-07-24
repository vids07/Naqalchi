# app/modal_app.py
"""
Modal App definition for Naqalchi.
Allows offloading heavy GPU tasks (CosyVoice and LivePortrait inference)
to serverless cloud infrastructure in a single command.
"""

try:
    import modal
except ImportError:
    modal = None

if modal:
    # 1. Define standard GPU image with all libraries (PyTorch, FFmpeg)
    image = (
        modal.Image.debian_slim(python_version="3.9")
        .apt_install("ffmpeg")
        .pip_install(
            "torch", 
            "torchaudio", 
            "pydantic", 
            "pydantic-settings", 
            "fastapi", 
            "uvicorn"
        )
    )
    
    stub = modal.Stub("naqalchi-pipeline")
    
    # 2. Modal-wrapped serverless function for OmniVoice synthesis
    @stub.function(image=image, cpu=2.0)
    def modal_generate_voice(text: str, voice_sample_bytes: bytes = None) -> bytes:
        from app.adapters.voice.omnivoice import OmniVoiceAdapter
        import tempfile
        
        # Instantiate voice adapter
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

    # 3. Modal-wrapped serverless function for DuixAvatar lip-sync (GPU accelerated)
    @stub.function(image=image, gpu="A10G", timeout=600)
    def modal_generate_avatar(audio_bytes: bytes, avatar_image_bytes: bytes) -> bytes:
        from app.adapters.face.duix_avatar import DuixAvatarAdapter
        import tempfile
        
        adapter = DuixAvatarAdapter()
        
        # Save bytes to temporary files for execution
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as audio_tmp, \
             tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as img_tmp:
            
            audio_tmp.write(audio_bytes)
            audio_tmp.flush()
            
            img_tmp.write(avatar_image_bytes)
            img_tmp.flush()
            
            video_path = adapter.generate_avatar_video(audio_tmp.name, img_tmp.name)
            
        with open(video_path, "rb") as f:
            return f.read()
else:
    # If running locally without Modal SDK installed
    stub = None
    print("[Modal App] Modal SDK not installed. Cloud GPU offloading disabled.")
