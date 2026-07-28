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

@router.post("/voice/synthesize")
async def synthesize_voice(
    reference_audio: UploadFile = File(...),
    text: str = Form(...)
):
    import io
    from fastapi.responses import StreamingResponse
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text content cannot be empty")
        
    try:
        ref_bytes = await reference_audio.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read reference audio: {str(e)}")
        
    try:
        import modal
        clone_voice = modal.Function.from_name("naqalchi-omnivoice", "clone_voice")
        out_bytes = clone_voice.remote(text=text, ref_audio_bytes=ref_bytes)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Voice synthesis via Modal GPU failed: {str(e)}")
        
    return StreamingResponse(io.BytesIO(out_bytes), media_type="audio/wav")

@router.post("/personas/generate-voice-key")
async def generate_voice_key(
    reference_audio: UploadFile = File(...),
    consent_audio: UploadFile = File(...)
):
    import os
    import base64
    import requests
    import subprocess
    import google.auth
    import google.auth.transport.requests
    from app.config.settings import settings

    # Define temporary files
    ref_temp_in = os.path.join(settings.UPLOAD_DIR, f"temp_ref_in_{uuid.uuid4()}_{reference_audio.filename}")
    ref_temp_wav = os.path.join(settings.UPLOAD_DIR, f"temp_ref_out_{uuid.uuid4()}.wav")
    consent_temp_in = os.path.join(settings.UPLOAD_DIR, f"temp_con_in_{uuid.uuid4()}_{consent_audio.filename}")
    consent_temp_wav = os.path.join(settings.UPLOAD_DIR, f"temp_con_out_{uuid.uuid4()}.wav")

    try:
        # Save reference audio to temp input
        with open(ref_temp_in, "wb") as f:
            content = await reference_audio.read()
            f.write(content)

        # Save consent audio to temp input
        with open(consent_temp_in, "wb") as f:
            content = await consent_audio.read()
            f.write(content)

        # Helper to convert to LINEAR16 (wav, mono, 16000Hz) using ffmpeg
        def convert_to_wav(in_path, out_path):
            cmd = [
                "ffmpeg", "-y",
                "-i", in_path,
                "-acodec", "pcm_s16le",
                "-ar", "16000",
                "-ac", "1",
                out_path
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Convert both audios
        try:
            convert_to_wav(ref_temp_in, ref_temp_wav)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process reference audio: {str(e)}")

        try:
            convert_to_wav(consent_temp_in, consent_temp_wav)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process consent audio: {str(e)}")

        # Base64 encode the processed audio contents
        with open(ref_temp_wav, "rb") as f:
            ref_b64 = base64.b64encode(f.read()).decode("utf-8")

        with open(consent_temp_wav, "rb") as f:
            consent_b64 = base64.b64encode(f.read()).decode("utf-8")

        # Load scoped credentials
        credentials_path = "C:/Users/USER/Downloads/fitnearn-devops-5371c7c3e4eb.json"
        if not os.path.exists(credentials_path):
            raise HTTPException(status_code=500, detail="GCP service account key file not found in Downloads directory.")

        try:
            credentials, project_id = google.auth.load_credentials_from_file(credentials_path)
            credentials = credentials.with_scopes(["https://www.googleapis.com/auth/cloud-platform"])
            req = google.auth.transport.requests.Request()
            credentials.refresh(req)
            access_token = credentials.token
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to authenticate with GCP credentials: {str(e)}")

        # Construct request body for voices:generateVoiceCloningKey
        url = "https://texttospeech.googleapis.com/v1beta1/voices:generateVoiceCloningKey"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "x-goog-user-project": project_id,
            "Content-Type": "application/json; charset=utf-8"
        }
        
        request_body = {
            "reference_audio": {
                "audio_config": {"audio_encoding": "LINEAR16"},
                "content": ref_b64
            },
            "voice_talent_consent": {
                "audio_config": {"audio_encoding": "LINEAR16"},
                "content": consent_b64
            },
            "consent_script": "I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model.",
            "language_code": "en-US"
        }

        # Dispatch Google API request
        response = requests.post(url, headers=headers, json=request_body)
        
        if response.status_code != 200:
            error_msg = f"Google API error ({response.status_code}): "
            try:
                error_json = response.json()
                if "error" in error_json:
                    error_msg += error_json["error"].get("message", response.text)
                else:
                    error_msg += response.text
            except Exception:
                error_msg += response.text
            raise HTTPException(status_code=response.status_code, detail=error_msg)

        voice_cloning_key = response.json().get("voiceCloningKey")
        if not voice_cloning_key:
            raise HTTPException(status_code=500, detail="Google API response did not contain a voiceCloningKey.")

        return {"voiceCloningKey": voice_cloning_key}

    finally:
        # Ensure clean resource disposal
        for path in [ref_temp_in, ref_temp_wav, consent_temp_in, consent_temp_wav]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

