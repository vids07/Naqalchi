# app/config/settings.py
import os

try:
    from pydantic_settings import BaseSettings
    class Settings(BaseSettings):
        PROJECT_NAME: str = "Naqalchi AI"
        API_V1_STR: str = "/api"
        BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        UPLOAD_DIR: str = os.path.join(BASE_DIR, "..", "uploads")
        OUTPUT_DIR: str = os.path.join(BASE_DIR, "..", "outputs")
        DEFAULT_VOICE_MODEL: str = "omnivoice"
        DEFAULT_FACE_MODEL: str = "duix_avatar"
        MIN_AUDIO_DURATION_SEC: float = 0.5
        MAX_DURATION_MISMATCH_SEC: float = 2.0
except ImportError:
    # Fallback to standard object if pydantic-settings isn't installed
    class Settings:
        PROJECT_NAME: str = "Naqalchi AI"
        API_V1_STR: str = "/api"
        BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        UPLOAD_DIR: str = os.path.join(BASE_DIR, "..", "uploads")
        OUTPUT_DIR: str = os.path.join(BASE_DIR, "..", "outputs")
        DEFAULT_VOICE_MODEL: str = "omnivoice"
        DEFAULT_FACE_MODEL: str = "duix_avatar"
        MIN_AUDIO_DURATION_SEC: float = 0.5
        MAX_DURATION_MISMATCH_SEC: float = 2.0

    
    class Config:
        env_prefix = "NAQALCHI_"

# Ensure storage directories exist
settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
