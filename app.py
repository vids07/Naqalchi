# app.py
import os
import time
import uuid
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Naqalchi AI Voice & Avatar Generation API",
    description="Python integration server for real-time video generation rendering.",
    version="1.0.0"
)

# Enable CORS for frontend calling from port 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for custom personas (to combine with default ones)
class Persona(BaseModel):
    id: str
    name: str
    avatarUrl: Optional[str] = None
    voiceClipName: Optional[str] = None
    faceClipName: Optional[str] = None

CUSTOM_PERSONAS = []

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

@app.get("/api/health")
def health_check():
    return {"status": "connected", "message": "Python backend integration is running smoothly!"}

@app.get("/api/personas", response_model=List[Persona])
def get_personas():
    # Return custom personas added via backend
    return CUSTOM_PERSONAS

@app.post("/api/personas", response_model=Persona)
async def create_persona(
    name: str = Form(...),
    voice_clip: Optional[UploadFile] = File(None),
    face_clip: Optional[UploadFile] = File(None)
):
    persona_id = str(uuid.uuid4())
    
    # In a real implementation, you would save files to a directory:
    # os.makedirs("uploads", exist_ok=True)
    # with open(f"uploads/{voice_clip.filename}", "wb") as f:
    #     f.write(await voice_clip.read())
    
    new_persona = Persona(
        id=persona_id,
        name=name,
        avatarUrl=None,  # Fallback to initials in frontend
        voiceClipName=voice_clip.filename if voice_clip else None,
        faceClipName=face_clip.filename if face_clip else None
    )
    CUSTOM_PERSONAS.append(new_persona)
    return new_persona

@app.post("/api/generate", response_model=GenerationResult)
async def generate_content(request: GenerationRequest):
    if not request.script.strip():
        raise HTTPException(status_code=400, detail="Script content cannot be empty")
    
    # Real AI execution hooks would go here:
    # 1. Run voice generation using request.voiceModel and request.script
    # 2. Run video/lipsync synthesis using request.faceModel and the persona files
    # For now, we simulate a small server delay or return immediate parameters
    
    generation_id = str(uuid.uuid4())
    
    return GenerationResult(
        id=generation_id,
        script=request.script,
        personaId=request.personaId,
        videoUrl="/sample_video.mp4", # Frontend handles rendering on canvas or video
        elapsedTime=4, # Simulation duration
        createdAt=time.time()
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
