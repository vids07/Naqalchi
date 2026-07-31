# Naqalchi 🎭

Naqalchi is a high-performance modular pipeline for generative video and audio content synthesis. It enables zero-shot neural voice cloning, expressive avatar lip-sync, and high-fidelity face animation driven entirely by conversational scripts.

---

## Face Clone Module

The Naqalchi Face Clone module provides a high-fidelity face animation and lip-syncing engine driven by Hallo. It allows developers to animate a static, square portrait image of a presenter using a driving audio soundtrack. The module features dual runtime execution modes: a high-speed local **Simulation Mode** that leverages ffmpeg to stitch inputs instantly for zero-cost pipeline validation, and a cloud-native **Modal GPU Mode** that schedules heavy inference workers on dedicated Nvidia A10G GPUs.

### Architecture Overview

The following diagram illustrates the flow of a face animation job from client upload to final synthesized video output:

```
+---------+         +---------+         +-----------------+         +----------------+
| Browser |  ---->  | FastAPI |  ---->  | BackgroundTasks |  ---->  |  HalloAdapter  |
+---------+         +---------+         +-----------------+         +----------------+
     ^                   |                           _ _ _ _ _ _ _ _ _ _ _ _/ | (Mode check)
     |                   v                          |                         v
     |             +-----------+                    | (Simulation)     +--------------+
     |             |  Mock DB  |                    |                  |  Modal Cloud |
     |             +-----------+                    v                  |  (A10G GPU)  |
     |                   ^                   +--------------+          +--------------+
     |                   |                   |  FFmpeg Path |                 |
     |                   |                   +--------------+                 | (Inference)
     |                   |                          |                         v
     |                   |                          |                 +--------------+
     |                   | (Sync status)            \---------------- |  Return MP4  |
     |                   |                                            +--------------+
     v                   |                                                   |
+---------+              |                                                   v
| Poller  |  ------------/                                            +--------------+
+---------+                                                           | Write Output |
                                                                      +--------------+
```

### Prerequisites

To run the Face Clone module locally on your development system, you must install the following system and Python dependencies:

1. **System Binaries:**
   - **FFmpeg & FFprobe:** Installed and available on your system `PATH`. Used for local simulation video rendering, audio downmixing, and metadata probing.

2. **Python Packages:**
   - **`opencv-python`:** Used for portrait decoding and spatial dimension calculations.
   - **`mediapipe`:** Used for high-fidelity facial land-marking, bounding coordinates, and face height ratio validation.
   - **`pydub`:** Used for conversational audio decoding, stereo-to-mono downmixing, and peak amplitude normalization.
   - **`numpy`:** Used for array transformations and programmatic test data generation.

---

### Environment Variables

Configure the following variables in a `.env` file at your project's root:

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `MODAL_TOKEN_ID` | No | *None* | Your Modal API authorization token ID. If omitted, the adapter automatically initializes in local Simulation Mode. |
| `MODAL_TOKEN_SECRET` | No | *None* | Your Modal API authorization token secret key. |
| `MODAL_FALLBACK_TO_SIMULATION` | No | `false` | When set to `true`, if a remote GPU cold-start fails or hits rate-limits, the adapter falls back to local Simulation Mode rather than raising an exception. |
| `HF_TOKEN` | No | *None* | HuggingFace access token used to download pretrained Hallo weight repositories securely. |

---

### Running Locally (Simulation Mode)

Simulation mode allows you to verify browser integrations, job status state-machines, and progress tracking bars without consuming GPU billings.

#### 1. Start the FastAPI Backend Server
```bash
python main.py
```
*The server boots on port `8000` with hot-reloading active.*

#### 2. Start the Vite Frontend Server
```bash
npm run dev
```
*The React UI dashboard is served at `http://localhost:3000`.*

#### 3. Test the Endpoint via Curl
Submit an animation job:
```bash
curl.exe -X POST http://localhost:8000/api/v1/face/animate \
  -F "source_image=@test_face.jpg" \
  -F "driving_audio=@test_audio.wav" \
  -F "pose_weight=1.0" \
  -F "face_weight=1.0" \
  -F "lip_weight=1.0"
```
Response:
```json
{"job_id":"f99a37bf-2750-4cec-b9cc-b505faab2228","estimated_time_seconds":18.3}
```

Poll for status:
```bash
curl.exe http://localhost:8000/api/v1/face/jobs/f99a37bf-2750-4cec-b9cc-b505faab2228
```
Response:
```json
{
  "job_id": "f99a37bf-2750-4cec-b9cc-b505faab2228",
  "status": "completed",
  "progress_percentage": 100,
  "output_url": "/outputs/f99a37bf-2750-4cec-b9cc-b505faab2228.mp4",
  "error": null
}
```

---

### Deploying the Modal Worker

To deploy and execute the real Hallo model on an Nvidia A10G Cloud GPU:

1. **Deploy the Worker App to Modal Cloud:**
   ```bash
   modal deploy modal_workers/naqalchi_hallo_worker.py
   ```

2. **Pre-hydrate and Cache Weights (Highly Recommended):**
   This task downloads the ~15GB pretrained weights directly to your persistent Modal Volume, preventing cold-start timeouts.
   ```bash
   modal run modal_workers/naqalchi_hallo_worker.py::download_weights
   ```

3. **Run a Direct Remote CLI Test:**
   ```bash
   modal run modal_workers/naqalchi_hallo_worker.py test_face.jpg test_audio.wav
   ```

---

### Image Requirements

To pass validation, the uploaded presenter image must meet the following constraints:
- **Aspect Ratio:** Must be exactly `1:1` square format (with a tiny `±1%` tolerance allowance).
- **Format:** Must be standard `PNG`, `JPG`, or `JPEG`.
- **File Size:** Must not exceed `10MB` in total bytes.
- **Presenter Face Height:** The presenter's face (top of forehead to bottom of chin) must occupy between `50.0%` and `70.0%` of the total vertical height of the image frame (computed using landmarks `10` and `152` in MediaPipe FaceMesh).
- **Presenter Orientation:** The face must be forward-facing with direct gaze, with a horizontal facial rotation of less than `30°`.

---

### Known Limitations

- **English-First Modeling:** While Hallo accepts any language, lip-sync alignments and expression accuracies are highly optimized for English pronunciation.
- **Incompatible with Real-Time:** Generation speeds map to roughly 4-5x real-time duration on an Nvidia A10G. This is an offline batch pipeline and is not suitable for live streaming or immediate interactive chat.
- **GPU Thresholds:** Requires a minimum of a cloud-native Nvidia A10G (24GB VRAM) instance. Running inference on smaller, consumer GPUs is not supported.
- **Cold-Start Latency:** Cold container allocations may suffer a 1-2 minute latency wait as PyTorch and CUDA runtime images are mounted.
