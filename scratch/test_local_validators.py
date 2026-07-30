import os
import sys

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.validators.face_validator import validate_image, validate_audio

avatar_path = "test_face.jpg"
audio_path = "test_voice.wav"

print("--- Testing Image Validator ---")
try:
    with open(avatar_path, "rb") as f:
        img_bytes = f.read()
    validate_image(img_bytes)
    print("SUCCESS: Image is valid!")
except Exception as e:
    print(f"FAILED: Image validation failed: {e}")

print("\n--- Testing Audio Validator ---")
try:
    with open(audio_path, "rb") as f:
        aud_bytes = f.read()
    norm_bytes = validate_audio(aud_bytes)
    print(f"SUCCESS: Audio is valid! Original: {len(aud_bytes)} bytes, Normalized: {len(norm_bytes)} bytes.")
except Exception as e:
    print(f"FAILED: Audio validation failed: {e}")
