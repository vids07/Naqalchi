"""
Face and Audio Validators for Naqalchi Face Animation.
Verifies format, dimensions, aspect ratio, face proportion using MediaPipe, 
and handles audio channel downmixing & normalization using pydub.
"""
import io
import cv2
import numpy as np
import mediapipe as mp
from fastapi import HTTPException
from pydub import AudioSegment

def validate_image(file_bytes: bytes) -> None:
    """
    1. Check format is PNG/JPG/JPEG.
    2. Check aspect ratio is 1:1 (±1% tolerance).
    3. Check file size <= 10MB.
    4. Use MediaPipe FaceMesh to verify face occupies 50-70% of frame height.
    """
    # 3. Check file size <= 10MB
    max_size = 10 * 1024 * 1024
    if len(file_bytes) > max_size:
        raise HTTPException(status_code=400, detail="Image file size exceeds the 10MB limit.")

    # 1. Check format using magic bytes before decoding
    VALID_IMAGE_MAGIC = [
        b'\xff\xd8\xff',        # JPEG/JPG
        b'\x89PNG\r\n\x1a\n',  # PNG
    ]
    if not any(file_bytes.startswith(magic) for magic in VALID_IMAGE_MAGIC):
        raise HTTPException(status_code=400, detail="Image must be PNG, JPG, or JPEG format.")

    # Decode image
    np_arr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file or format. Must be a valid PNG, JPG, or JPEG.")

    # 2. Check aspect ratio is 1:1 (±1% tolerance)
    h, w = img.shape[:2]
    aspect_ratio = w / h
    if not (0.99 <= aspect_ratio <= 1.01):
        raise HTTPException(status_code=400, detail="Image aspect ratio must be 1:1 (±1% tolerance).")

    # 4. Use mediapipe FaceMesh to verify face occupies 50-70% of frame height
    mp_face_mesh = mp.solutions.face_mesh
    try:
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        ) as face_mesh:
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_img)
            
            if not results.multi_face_landmarks:
                raise HTTPException(status_code=400, detail="No face detected in the image.")
                
            face_landmarks = results.multi_face_landmarks[0]
            landmarks = face_landmarks.landmark
            
            # Use forehead top (10) and chin bottom (152) for accurate face height
            FOREHEAD_IDX = 10
            CHIN_IDX = 152
            face_height_pct = (landmarks[CHIN_IDX].y - landmarks[FOREHEAD_IDX].y) * 100.0
            
            if not (50.0 <= face_height_pct <= 70.0):
                raise HTTPException(
                    status_code=400,
                    detail=f"Face must occupy 50-70% of frame height (detected {face_height_pct:.1f}%)."
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Face validation failed: {str(e)}")

def validate_audio(file_bytes: bytes) -> bytes:
    """
    1. Check format is WAV.
    2. Check file size <= 25MB.
    3. Downmix stereo to mono if needed (use pydub).
    4. Run peak amplitude normalization to -1.0 dB (use pydub).
    Return normalized audio bytes.
    """
    # 2. Check file size <= 25MB
    max_size = 25 * 1024 * 1024
    if len(file_bytes) > max_size:
        raise HTTPException(status_code=400, detail="Audio file size exceeds the 25MB limit.")

    # 1. Check WAV format (via magic bytes)
    if not (file_bytes.startswith(b"RIFF") and b"WAVE" in file_bytes[8:12]):
        raise HTTPException(status_code=400, detail="Audio file must be in WAV format.")

    try:
        # Load audio segment from bytes
        audio = AudioSegment.from_file(io.BytesIO(file_bytes), format="wav")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode WAV file: {str(e)}")

    # Check for silent files
    if audio.max_dBFS == -float('inf'):
        raise HTTPException(status_code=400, detail="Audio file is silent. Please upload a file with actual audio content.")

    # 3. Downmix stereo to mono if needed
    if audio.channels > 1:
        audio = audio.set_channels(1)

    # 4. Run peak amplitude normalization to -1.0 dB
    target_dbfs = -1.0
    change_in_dbfs = target_dbfs - audio.max_dBFS
    audio = audio.apply_gain(change_in_dbfs)

    # Export to bytes
    out_io = io.BytesIO()
    audio.export(out_io, format="wav")
    return out_io.getvalue()
