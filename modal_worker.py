import os
import modal

# Parse local .env if it exists
env_vars = {}
if os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                env_vars[k.strip()] = v.strip()

# Set up Modal App
app = modal.App("naqalchi-omnivoice")

# Pass HF_TOKEN secret if available
secrets = []
hf_token = env_vars.get("HF_TOKEN") or os.environ.get("HF_TOKEN")
if hf_token:
    secrets.append(modal.Secret.from_dict({"HF_TOKEN": hf_token}))

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "torch",
        "torchaudio",
        "omnivoice",
        "soundfile",
    )
)

@app.function(gpu="A10G", image=image, timeout=300, secrets=secrets)
def clone_voice(text: str, ref_audio_bytes: bytes) -> bytes:
    import os
    import tempfile
    import torch
    import soundfile as sf
    from omnivoice import OmniVoice

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as ref_file:
        ref_file.write(ref_audio_bytes)
        ref_file_path = ref_file.name

    model = OmniVoice.from_pretrained(
        "k2-fsa/OmniVoice",
        device_map="cuda:0",
        dtype=torch.float16,
    )
    
    audio = model.generate(
        text=text,
        ref_audio=ref_file_path
    )
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_file:
        out_file_path = out_file.name
        sf.write(out_file_path, audio[0], 24000)

    with open(out_file_path, "rb") as f:
        out_bytes = f.read()

    try:
        os.remove(ref_file_path)
        os.remove(out_file_path)
    except Exception:
        pass

    return out_bytes
