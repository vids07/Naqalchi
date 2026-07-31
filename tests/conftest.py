# tests/conftest.py
import pytest
import wave
import struct
import math
import io
import numpy as np
import cv2

@pytest.fixture
def valid_png_bytes():
    """Generates realistic valid PNG bytes with a drawn shape."""
    # Draw a 512x512 white square with a filled ellipse as face proxy
    img = np.ones((512, 512, 3), dtype=np.uint8) * 240
    cv2.ellipse(img, (256, 256), (120, 160), 0, 0, 360, (200, 180, 160), -1)
    _, buf = cv2.imencode('.png', img)
    return buf.tobytes()

@pytest.fixture  
def valid_wav_bytes():
    """Generates a real 1-second 440Hz sine wave at 8000Hz sample rate."""
    sample_rate = 8000
    duration = 1
    frequency = 440
    samples = [
        int(32767 * math.sin(2 * math.pi * frequency * t / sample_rate))
        for t in range(sample_rate * duration)
    ]
    buf = io.BytesIO()
    with wave.open(buf, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(struct.pack(f'{len(samples)}h', *samples))
    return buf.getvalue()
