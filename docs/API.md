# Naqalchi Face Clone API Reference 🎭

This document provides a clean, detailed API reference for the Naqalchi Face Clone and Animation endpoints, including input fields, constraints, success schemas, error response models, and job status lifecycle flows.

---

## Quick Start

Go from zero to a completed avatar video in three simple terminal commands:

1. **Submit an Animation Job:**
   ```bash
   curl.exe -X POST http://localhost:8000/api/v1/face/animate \
     -F "source_image=@test_face.jpg" \
     -F "driving_audio=@test_audio.wav"
   ```
   *Expected Response:*
   ```json
   {"job_id":"f99a37bf-2750-4cec-b9cc-b505faab2228","estimated_time_seconds":18.3}
   ```

2. **Poll Status Using the Returned Job ID:**
   ```bash
   curl.exe http://localhost:8000/api/v1/face/jobs/f99a37bf-2750-4cec-b9cc-b505faab2228
   ```
   *Expected Response:*
   ```json
   {
     "job_id": "f99a37bf-2750-4cec-b9cc-b505faab2228",
     "status": "completed",
     "progress_percentage": 100,
     "output_url": "/outputs/f99a37bf-2750-4cec-b9cc-b505faab2228.mp4",
     "error": null
   }
   ```

3. **Download the Synthesized Video:**
   Once status is `completed`, fetch your playable output:
   ```bash
   curl.exe -O http://localhost:8000/outputs/f99a37bf-2750-4cec-b9cc-b505faab2228.mp4
   ```

---

## Job Status Lifecycle

A job moves through the following state machine transitions during its background execution lifetime:

```
          [POST Animate]
                 |
                 v
             +-------+
             | queued| (0% Progress)
             +-------+
                 |
                 v
          +------------+
          | validating | (15% Progress)
          +------------+
                 |
                 v
          +------------+
          | processing | (50% Progress)
          +------------+
                 |
         /-------+-------\
        |                 |
        v                 v
  +-----------+     +----------+
  | completed |     |  failed  | (100% Progress)
  +-----------+     +----------+
```

| Status | Progress | Description |
| :--- | :---: | :--- |
| `queued` | `0%` | Job record created and added to the execution thread pool. |
| `validating` | `15%` | The synchronizer verifies magic bytes, sizes, image aspects, face proportions, and downmixes/normalizes WAV audio. |
| `processing` | `50%` | The job has been dispatched to the Hallo adapter for synthesis (FFmpeg simulation or remote Modal A10G). |
| `completed` | `100%` | MP4 video synthesized successfully, stored on disk, and output URL populated. |
| `failed` | `100%` | Validation or inference crashed. The `error` field contains the crash log stack trace. |

---

## Endpoint Details

### 1. Submit Face Animation Job
**`POST /api/v1/face/animate`**

Accepts multipart form-data, runs synchronous validations, persists input files, and registers a background worker job task.

#### Request Format (`multipart/form-data`)

| Parameter | Type | Required | Default | Constraints / Description |
| :--- | :---: | :---: | :--- | :--- |
| `source_image` | `File` | **Yes** | *None* | PNG, JPG, or JPEG. Under 10MB. Aspect ratio `1:1`. Presenter face height must span 50-70%. |
| `driving_audio` | `File` | **Yes** | *None* | WAV format only. Under 25MB. Non-silent. Automatically downmixed to mono and peak-normalized to -1.0 dB. |
| `pose_weight` | `float` | No | `1.0` | Range: `0.0` to `3.0`. Control scale of speaker head gestures and tilt sequences. |
| `face_weight` | `float` | No | `1.0` | Range: `0.0` to `3.0`. Control scale of eyes, cheeks, and eyebrow micro-expressions. |
| `lip_weight` | `float` | No | `1.0` | Range: `0.0` to `3.0`. Control scale of lip movement alignments and mouth contours. |

#### Responses

##### Success (202 Accepted)
```json
{
  "job_id": "f99a37bf-2750-4cec-b9cc-b505faab2228",
  "estimated_time_seconds": 18.3
}
```

##### Client Validation Error (400 Bad Request)
Occurs when image size, audio format, aspect ratio, or face mesh bounds checkpoints fail:
```json
{
  "detail": "Face must occupy 50-70% of frame height (detected 20.0%)."
}
```

##### Server Disk Error (500 Internal Server Error)
Occurs if files cannot be persisted to local workspace disk directory structures:
```json
{
  "detail": "Failed to persist files on disk: [Errno 28] No space left on device"
}
```

---

### 2. Retrieve Job Status
**`GET /api/v1/face/jobs/{job_id}`**

Returns current execution stage, percentage tracker progress, and output URL paths for a given Job ID.

#### Request Path Parameters

| Parameter | Type | Required | Description |
| :--- | :---: | :---: | :--- |
| `job_id` | `string` | **Yes** | The unique UUID token string returned during job submission. |

#### Responses

##### Success (200 OK - Processing Status)
```json
{
  "job_id": "f99a37bf-2750-4cec-b9cc-b505faab2228",
  "status": "processing",
  "progress_percentage": 50,
  "output_url": null,
  "error": null
}
```

##### Success (200 OK - Completion Status)
```json
{
  "job_id": "f99a37bf-2750-4cec-b9cc-b505faab2228",
  "status": "completed",
  "progress_percentage": 100,
  "output_url": "/outputs/f99a37bf-2750-4cec-b9cc-b505faab2228.mp4",
  "error": null
}
```

##### Success (200 OK - Failure Status)
```json
{
  "job_id": "f99a37bf-2750-4cec-b9cc-b505faab2228",
  "status": "failed",
  "progress_percentage": 100,
  "output_url": null,
  "error": "ValueError: Ffmpeg binary missing"
}
```

##### Job Not Found (404 Not Found)
Occurs if the ID does not match any job records, or matches a voice synthesis job ID instead of a face job ID:
```json
{
  "detail": "Job not found"
}
```
