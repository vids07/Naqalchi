# app/db/mock_db.py
import time
from typing import Dict, List, Optional, Literal
from pydantic import BaseModel

class Persona(BaseModel):
    id: str
    name: str
    avatarUrl: Optional[str] = None
    voiceClipName: Optional[str] = None
    faceClipName: Optional[str] = None
    previewClipName: Optional[str] = None
    voiceModel: Optional[str] = None
    speed: Optional[float] = None
    pitch: Optional[float] = None

class Job(BaseModel):
    id: str
    script: Optional[str] = None
    personaId: Optional[str] = None
    voiceModel: Optional[str] = None
    faceModel: Optional[str] = None
    status: Literal[
        "queued", "validating", "processing", 
        "completed", "failed", "generating_voice", "generating_avatar"
    ] = "queued"
    videoUrl: Optional[str] = None
    errorMessage: Optional[str] = None
    elapsedTime: Optional[int] = None
    createdAt: float
    
    # Face clone specific fields
    job_type: Literal["voice", "face", "avatar"] = "avatar"
    source_image_path: Optional[str] = None
    driving_audio_path: Optional[str] = None
    pose_weight: float = 1.0
    face_weight: float = 1.0
    lip_weight: float = 1.0
    output_video_url: Optional[str] = None

# In-memory global databases
CUSTOM_PERSONAS: List[Persona] = []
JOBS_DB: Dict[str, Job] = {}

import os
import json

DB_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "custom_personas.json")

def load_from_disk():
    global CUSTOM_PERSONAS
    try:
        if os.path.exists(DB_FILE):
            with open(DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                CUSTOM_PERSONAS = [Persona(**p) for p in data]
    except Exception as e:
        print(f"Error loading custom_personas.json: {e}")

def save_to_disk():
    try:
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump([p.dict() for p in CUSTOM_PERSONAS], f, indent=2)
    except Exception as e:
        print(f"Error saving custom_personas.json: {e}")

# Initial load
load_from_disk()

def get_personas() -> List[Persona]:
    return CUSTOM_PERSONAS

def add_persona(persona: Persona) -> Persona:
    CUSTOM_PERSONAS.append(persona)
    save_to_disk()
    return persona

def get_job(job_id: str) -> Optional[Job]:
    return JOBS_DB.get(job_id)

def create_job(job_id: str, script: str, persona_id: str, voice_model: str, face_model: str) -> Job:
    job = Job(
        id=job_id,
        script=script,
        personaId=persona_id,
        voiceModel=voice_model,
        faceModel=face_model,
        job_type="avatar",
        status="queued",
        createdAt=time.time()
    )
    JOBS_DB[job_id] = job
    return job

def create_face_job(
    job_id: str,
    source_image_path: str,
    driving_audio_path: str,
    pose_weight: float = 1.0,
    face_weight: float = 1.0,
    lip_weight: float = 1.0
) -> Job:
    job = Job(
        id=job_id,
        job_type="face",
        source_image_path=source_image_path,
        driving_audio_path=driving_audio_path,
        pose_weight=pose_weight,
        face_weight=face_weight,
        lip_weight=lip_weight,
        status="queued",
        createdAt=time.time()
    )
    JOBS_DB[job_id] = job
    return job

def update_job_status(job_id: str, status: Literal["queued", "validating", "processing", "completed", "failed", "generating_voice", "generating_avatar"], video_url: Optional[str] = None, output_video_url: Optional[str] = None, error_message: Optional[str] = None, elapsed_time: Optional[int] = None) -> Optional[Job]:
    if job_id in JOBS_DB:
        JOBS_DB[job_id].status = status
        if video_url:
            JOBS_DB[job_id].videoUrl = video_url
        if output_video_url:
            JOBS_DB[job_id].output_video_url = output_video_url
        if error_message:
            JOBS_DB[job_id].errorMessage = error_message
        if elapsed_time is not None:
            JOBS_DB[job_id].elapsedTime = elapsed_time
        return JOBS_DB[job_id]
    return None
