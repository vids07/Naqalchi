# app/api/routes.py
import uuid
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from app.db import mock_db
from app.db.mock_db import Persona
from app.orchestrator.pipeline import pipeline

router = APIRouter()

# Input validation schemas
class GenerationRequest(BaseModel):
    script: str
    personaId: str
    voiceModel: str
    faceModel: str

class GenerationResult(BaseModel):
    id: str
    script: str
    personaId: str
    videoUrl: str
    elapsedTime: int
    createdAt: float

@router.get("/health")
def health_check():
    return {"status": "connected", "message": "Naqalchi modular backend integration is running smoothly!"}

@router.get("/personas", response_model=List[Persona])
def get_personas():
    return mock_db.get_personas()

@router.post("/personas", response_model=Persona)
async def create_persona(
    name: str = Form(...),
    voice_clip: Optional[UploadFile] = File(None),
    face_clip: Optional[UploadFile] = File(None)
):
    import os
    from app.config.settings import settings

    persona_id = str(uuid.uuid4())
    
    voice_clip_name = None
    if voice_clip and voice_clip.filename:
        voice_clip_name = voice_clip.filename
        upload_path = os.path.join(settings.UPLOAD_DIR, voice_clip.filename)
        with open(upload_path, "wb") as f:
            content = await voice_clip.read()
            f.write(content)
            
    face_clip_name = None
    if face_clip and face_clip.filename:
        face_clip_name = face_clip.filename
        upload_path = os.path.join(settings.UPLOAD_DIR, face_clip.filename)
        with open(upload_path, "wb") as f:
            content = await face_clip.read()
            f.write(content)
    
    new_persona = Persona(
        id=persona_id,
        name=name,
        avatarUrl=None,
        voiceClipName=voice_clip_name,
        faceClipName=face_clip_name
    )
    mock_db.add_persona(new_persona)
    return new_persona

@router.post("/generate", response_model=GenerationResult)
async def generate_content(request: GenerationRequest):
    if not request.script.strip():
        raise HTTPException(status_code=400, detail="Script content cannot be empty")
        
    try:
        # Route processing through our orchestrator pipeline
        result = pipeline.execute(
            script=request.script,
            persona_id=request.personaId,
            voice_model=request.voiceModel,
            face_model=request.faceModel
        )
        
        import time
        generation_id = str(uuid.uuid4())
        return GenerationResult(
            id=generation_id,
            script=request.script,
            personaId=request.personaId,
            videoUrl=result["video_url"],
            elapsedTime=result["elapsed_time"],
            createdAt=time.time()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation pipeline failed: {str(e)}")
