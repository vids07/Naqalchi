# app/db/mock_db.py
import time
from typing import Dict, List, Optional
from pydantic import BaseModel

class Persona(BaseModel):
    id: str
    name: str
    avatarUrl: Optional[str] = None
    voiceClipName: Optional[str] = None
    faceClipName: Optional[str] = None

class Job(BaseModel):
    id: str
    script: str
    personaId: str
    voiceModel: str
    faceModel: str
    status: str  # "queued", "generating_voice", "generating_avatar", "completed", "failed"
    videoUrl: Optional[str] = None
    errorMessage: Optional[str] = None
    elapsedTime: Optional[int] = None
    createdAt: float

# In-memory global databases
CUSTOM_PERSONAS: List[Persona] = []
JOBS_DB: Dict[str, Job] = {}

def get_personas() -> List[Persona]:
    return CUSTOM_PERSONAS

def add_persona(persona: Persona) -> Persona:
    CUSTOM_PERSONAS.append(persona)
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
        status="queued",
        createdAt=time.time()
    )
    JOBS_DB[job_id] = job
    return job

def update_job_status(job_id: str, status: str, video_url: Optional[str] = None, error_message: Optional[str] = None, elapsed_time: Optional[int] = None) -> Optional[Job]:
    if job_id in JOBS_DB:
        JOBS_DB[job_id].status = status
        if video_url:
            JOBS_DB[job_id].videoUrl = video_url
        if error_message:
            JOBS_DB[job_id].errorMessage = error_message
        if elapsed_time is not None:
            JOBS_DB[job_id].elapsedTime = elapsed_time
        return JOBS_DB[job_id]
    return None
