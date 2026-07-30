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
    face_clip: Optional[UploadFile] = File(None),
    preview_clip: Optional[UploadFile] = File(None)
):
    import os
    from app.config.settings import settings

    persona_id = str(uuid.uuid4())
    
    voice_clip_name = None
    if voice_clip and voice_clip.filename:
        # Give it a unique prefix or keep name
        voice_clip_name = f"voice_{persona_id}_{voice_clip.filename}"
        upload_path = os.path.join(settings.UPLOAD_DIR, voice_clip_name)
        with open(upload_path, "wb") as f:
            content = await voice_clip.read()
            f.write(content)
            
    face_clip_name = None
    if face_clip and face_clip.filename:
        face_clip_name = f"face_{persona_id}_{face_clip.filename}"
        upload_path = os.path.join(settings.UPLOAD_DIR, face_clip_name)
        with open(upload_path, "wb") as f:
            content = await face_clip.read()
            f.write(content)

    preview_clip_name = None
    if preview_clip and preview_clip.filename:
        preview_clip_name = f"preview_{persona_id}_{preview_clip.filename}"
        upload_path = os.path.join(settings.UPLOAD_DIR, preview_clip_name)
        with open(upload_path, "wb") as f:
            content = await preview_clip.read()
            f.write(content)
    
    new_persona = Persona(
        id=persona_id,
        name=name,
        avatarUrl=None,
        voiceClipName=voice_clip_name,
        faceClipName=face_clip_name,
        previewClipName=preview_clip_name
    )
    mock_db.add_persona(new_persona)
    return new_persona

@router.get("/personas/{persona_id}/preview")
async def get_persona_preview(persona_id: str):
    import os
    from fastapi.responses import FileResponse
    from app.config.settings import settings

    # Find persona
    persona = None
    for p in mock_db.get_personas():
        if p.id == persona_id:
            persona = p
            break

    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    if not persona.voiceClipName:
        raise HTTPException(status_code=404, detail="No reference voice clip saved for this persona")

    preview_path = os.path.join(settings.UPLOAD_DIR, persona.voiceClipName)
    if not os.path.exists(preview_path):
        raise HTTPException(status_code=404, detail="Reference audio file not found on disk")

    return FileResponse(preview_path, media_type="audio/wav")

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
        out_bytes = await clone_voice.remote.aio(text=text, ref_audio_bytes=ref_bytes)
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


# Face Clone / Animation endpoints (app/api/routes.py)
from fastapi import BackgroundTasks

@router.post("/v1/face/animate", status_code=202)
async def face_animate(
    background_tasks: BackgroundTasks,
    source_image: UploadFile = File(...),
    driving_audio: UploadFile = File(...),
    pose_weight: float = Form(1.0),
    face_weight: float = Form(1.0),
    lip_weight: float = Form(1.0)
):
    """
    POST /api/v1/face/animate
    Accepts multipart form, validates image and audio, creates queued job,
    and runs face animation in background.
    """
    from app.validators import face_validator
    from app.orchestrator.pipeline import run_face_pipeline
    import wave
    import io
    
    # 1. Read files into memory
    try:
        source_image_bytes = await source_image.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read source image: {str(e)}")

    try:
        driving_audio_bytes = await driving_audio.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read driving audio: {str(e)}")

    # 2. Run validations synchronously
    face_validator.validate_image(source_image_bytes)
    normalized_audio_bytes = face_validator.validate_audio(driving_audio_bytes)

    # Calculate real estimate based on audio duration (5x real-time midpoint estimate)
    try:
        with wave.open(io.BytesIO(normalized_audio_bytes)) as wf:
            audio_duration = wf.getnframes() / wf.getframerate()
        estimated_time_seconds = round(audio_duration * 5, 1)
    except Exception:
        estimated_time_seconds = 30.0

    # 3. Create Job record in mock_db
    job_id = str(uuid.uuid4())
    
    import os
    from app.config.settings import settings
    
    source_image_path = os.path.join(settings.UPLOAD_DIR, f"face_src_{job_id}_{source_image.filename}")
    driving_audio_path = os.path.join(settings.UPLOAD_DIR, f"face_drv_{job_id}_{driving_audio.filename}")
    
    # Create the job record first to prevent orphaned files
    mock_db.create_face_job(
        job_id=job_id,
        source_image_path=source_image_path,
        driving_audio_path=driving_audio_path,
        pose_weight=pose_weight,
        face_weight=face_weight,
        lip_weight=lip_weight
    )

    # Now write validated files to disk safely
    try:
        with open(source_image_path, "wb") as f:
            f.write(source_image_bytes)
        with open(driving_audio_path, "wb") as f:
            f.write(normalized_audio_bytes)
    except Exception as e:
        mock_db.update_job_status(job_id=job_id, status="failed", error_message=f"Disk write failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to persist files on disk: {str(e)}")

    # 4. Dispatch run_face_pipeline as BackgroundTask
    background_tasks.add_task(
        run_face_pipeline,
        job_id=job_id,
        source_image_bytes=source_image_bytes,
        driving_audio_bytes=normalized_audio_bytes,
        pose_weight=pose_weight,
        face_weight=face_weight,
        lip_weight=lip_weight
    )

    # 5. Return 202
    return {
        "job_id": job_id,
        "estimated_time_seconds": estimated_time_seconds
    }

@router.get("/v1/face/jobs/{job_id}")
def get_face_job(job_id: str):
    """
    GET /api/v1/face/jobs/{job_id}
    Returns current job status, progress_percentage, output_url, and error.
    """
    job = mock_db.get_job(job_id)
    if not job or job.job_type != "face":
        raise HTTPException(status_code=404, detail="Job not found")

    progress_map = {
        "queued": 0,
        "validating": 15,
        "processing": 50,
        "completed": 100,
        "failed": 100
    }
    progress = progress_map.get(job.status, 0)

    return {
        "job_id": job_id,
        "status": job.status,
        "progress_percentage": progress,
        "output_url": job.output_video_url,
        "error": job.errorMessage
    }


