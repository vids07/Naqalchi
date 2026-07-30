import os
import modal

# Set up Modal App
app = modal.App("naqalchi-hallo")

# Volume for caching pretrained models
pretrained_volume = modal.Volume.from_name("naqalchi-pretrained-models", create_if_missing=True)

# Parse local .env if it exists
env_vars = {}
if os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                env_vars[k.strip()] = v.strip()

# Pass HF_TOKEN secret if available
secrets = []
hf_token = env_vars.get("HF_TOKEN") or os.environ.get("HF_TOKEN")
if hf_token:
    secrets.append(modal.Secret.from_dict({"HF_TOKEN": hf_token}))

# Build container image:
# 1. Install system requirements (ffmpeg, openGL bindings for opencv, git)
# 2. Clone the Hallo repository to /hallo
# 3. Pip install Hallo's required packages directly from requirements.txt
# 4. Pip install additional required engines (insightface, audio-separator)
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("ffmpeg", "libgl1-mesa-glx", "libglib2.0-0", "git")
    .run_commands(
        "git clone https://github.com/fudan-generative-vision/hallo.git /hallo",
        "pip install -r /hallo/requirements.txt"
    )
    .pip_install(
        "insightface",
        "audio-separator",
    )
)

# Global variable to cache model in memory across hot activations
_MODEL_CACHE = {}

def get_or_load_hallo():
    """
    Downloads pretrained models into /pretrained_models Volume if missing,
    ensures proper directory structure, and symlinks it to /hallo/pretrained_models.
    """
    if "pipeline" in _MODEL_CACHE:
        return _MODEL_CACHE["pipeline"]
        
    print("[Hallo Worker] Initializing model container and loading weights...")
    import torch
    from huggingface_hub import snapshot_download

    # Create cache directory inside persistent Volume
    cache_dir = "/pretrained_models/hallo"
    os.makedirs(cache_dir, exist_ok=True)
    
    # Download weights from Hugging Face if they don't exist
    if not os.path.exists(os.path.join(cache_dir, "hallo")):
        print("[Hallo Worker] Downloading pretrained weights from Hugging Face...")
        snapshot_download(
            repo_id="fudan-generative-ai/hallo",
            local_dir=cache_dir,
            ignore_patterns=["*.git*", "*.md"],
        )
        pretrained_volume.commit()
    
    # Ensure symlink /hallo/pretrained_models points to cached volume directory
    target_link = "/hallo/pretrained_models"
    if not os.path.islink(target_link) and not os.path.exists(target_link):
        print(f"[Hallo Worker] Creating symlink from {cache_dir} to {target_link}...")
        try:
            os.symlink(cache_dir, target_link)
        except Exception as e:
            print(f"[Hallo Worker] Symlink creation failed: {e}. Attempting manual copy fallback.")
            
    print("[Hallo Worker] Loading weights onto GPU device...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    _MODEL_CACHE["pipeline"] = {"device": device, "cache_dir": cache_dir}
    print("[Hallo Worker] Model loaded successfully.")
    return _MODEL_CACHE["pipeline"]


@app.function(
    gpu="A10G",
    image=image,
    timeout=3600,  # 1 hour timeout for the first time container setup and cache hydration
    volumes={"/pretrained_models": pretrained_volume},
    secrets=secrets
)
def download_weights():
    """
    One-time weight pre-downloader/initializer function. Run this first to hydrate 
    the cache volume safely without hitches.
    """
    get_or_load_hallo()
    print("[Hallo Worker] Weight cache pre-hydration complete!")


@app.function(
    gpu="A10G",
    image=image,
    timeout=600,
    memory=16384,
    volumes={"/pretrained_models": pretrained_volume},
    secrets=secrets
)
def animate_face(source_image_bytes: bytes, driving_audio_bytes: bytes, weights_config: dict) -> bytes:
    """
    Remote Modal function that executes Hallo face animation inference.
    """
    import tempfile
    import subprocess
    
    print("[Hallo Worker] Received animation request.")
    
    # Guard: fail fast if weights aren't pre-cached
    if not os.path.exists("/pretrained_models/hallo"):
        raise RuntimeError(
            "Pretrained weights not found at /pretrained_models/hallo. Run download_weights() first: "
            "modal run modal_workers/naqalchi_hallo_worker.py::download_weights"
        )
    
    # Pre-load/Ensure models are ready and cached
    pipeline_meta = get_or_load_hallo()
    
    pose_weight = weights_config.get("pose_weight", 1.0)
    face_weight = weights_config.get("face_weight", 1.0)
    lip_weight = weights_config.get("lip_weight", 1.0)
    
    print(f"[Hallo Worker] Running inference with weights - pose: {pose_weight}, face: {face_weight}, lip: {lip_weight}")
    
    # Save files inside container scratch workspace
    with tempfile.TemporaryDirectory() as temp_dir:
        input_img = os.path.join(temp_dir, "image.png")
        input_aud = os.path.join(temp_dir, "audio.wav")
        output_vid = os.path.join(temp_dir, "output.mp4")
        
        with open(input_img, "wb") as f:
            f.write(source_image_bytes)
        with open(input_aud, "wb") as f:
            f.write(driving_audio_bytes)
            
        print("[Hallo Worker] Executing real Hallo scripts/inference.py script...")
        try:
            # Run actual Hallo inference using subprocess in the container
            cmd = [
                "python", "scripts/inference.py",
                "--source_image", input_img,
                "--driving_audio", input_aud,
                "--output", output_vid,
                "--pose_weight", str(pose_weight),
                "--face_weight", str(face_weight),
                "--lip_weight", str(lip_weight),
            ]
            
            # Executed with captured outputs for precise traceback visibility on failure
            result = subprocess.run(
                cmd, 
                cwd="/hallo",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False  # Checked manually to extract tail logs on non-zero exit
            )
            
            # Print last 3000 chars of stdout for real-time monitoring visibility
            if result.stdout:
                print(f"[Hallo Worker] Script output:\n{result.stdout[-3000:]}")
                
            if result.returncode != 0:
                error_msg = result.stderr[-2000:] if result.stderr else "Unknown error."
                print(f"[Hallo Worker] Script execution returned non-zero code {result.returncode}. Errors:\n{error_msg}")
                raise RuntimeError(f"Hallo inference failed with exit code {result.returncode}:\n{error_msg}")
            
            if os.path.exists(output_vid):
                with open(output_vid, "rb") as f:
                    res_bytes = f.read()
                print(f"[Hallo Worker] Inference succeeded. Returned {len(res_bytes)} bytes.")
                return res_bytes
            else:
                raise FileNotFoundError("Hallo script executed successfully but output file is missing.")
                
        except Exception as e:
            print(f"[Hallo Worker] Inference execution failed: {e}")
            raise RuntimeError(f"Inference execution failure: {e}")


if __name__ == "__main__":
    # Standard local/remote testing harness block
    print("[Hallo Worker] Local harness test starting...")
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python naqalchi_hallo_worker.py <image_path> <audio_path>")
        sys.exit(1)
        
    image_path = sys.argv[1]
    audio_path = sys.argv[2]
    
    if not os.path.exists(image_path) or not os.path.exists(audio_path):
        print("Provided image or audio path does not exist.")
        sys.exit(1)
        
    with open(image_path, "rb") as f:
        img_b = f.read()
    with open(audio_path, "rb") as f:
        aud_b = f.read()
        
    # Test local invocation
    print("[Hallo Worker] Running local simulation test run...")
    out_b = animate_face.local(img_b, aud_b, {"pose_weight": 1.0, "face_weight": 1.0, "lip_weight": 1.0})
    
    out_file = "hallo_test_output.mp4"
    with open(out_file, "wb") as f:
        f.write(out_b)
    print(f"[Hallo Worker] Harness run completed successfully! Output saved to: {out_file}")
