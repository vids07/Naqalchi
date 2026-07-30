"""
Hallo Face Animation Adapter for Naqalchi.
Provides a local simulation mode and a remote Modal execution mode to run
the Hallo face animation pipeline.
"""
import os
import tempfile
import subprocess
from typing import Literal

class HalloAdapter:
    """
    Adapter for the Hallo face animation model supporting local simulation and
    cloud execution via Modal.
    """
    
    def __init__(self, mode: Literal["simulation", "modal"] = "simulation"):
        self.mode = mode
        print(f"[HalloAdapter] Initialized in {self.mode.upper()} mode.")

    async def animate(
        self,
        source_image_bytes: bytes,
        driving_audio_bytes: bytes,
        pose_weight: float,
        face_weight: float,
        lip_weight: float
    ) -> bytes:
        """
        Animate a face from a source image driven by an audio file, returning MP4 bytes.
        """
        if self.mode == "modal":
            print("[HalloAdapter] Dispatching face animation to remote Modal GPU...")
            try:
                import modal
                weights_config = {
                    "pose_weight": pose_weight,
                    "face_weight": face_weight,
                    "lip_weight": lip_weight
                }
                # Calls modal.Function.from_name("naqalchi-hallo", "animate_face")
                fn = modal.Function.from_name("naqalchi-hallo", "animate_face")
                res_bytes = await fn.remote.aio(source_image_bytes, driving_audio_bytes, weights_config)
                return res_bytes
            except Exception as e:
                if os.getenv("MODAL_FALLBACK_TO_SIMULATION", "false").lower() == "true":
                    print(f"[HalloAdapter] Modal remote call failed: {e}. Falling back to simulation mode.")
                    self.mode = "simulation"
                    return await self.animate(
                        source_image_bytes,
                        driving_audio_bytes,
                        pose_weight,
                        face_weight,
                        lip_weight
                    )
                else:
                    print(f"[HalloAdapter] Modal remote call failed: {e}. Fallback disabled. Raising exception.")
                    raise

        # --- Simulation Mode ---
        print(f"[HalloAdapter] [Simulation Mode] Generating placeholder video bytes...")
        
        # Write input image and audio to temporary files to construct an actual MP4 with ffmpeg
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_img = os.path.join(temp_dir, "input_img.png")
            temp_aud = os.path.join(temp_dir, "input_aud.wav")
            temp_out = os.path.join(temp_dir, "sim_output.mp4")

            with open(temp_img, "wb") as f:
                f.write(source_image_bytes)
            with open(temp_aud, "wb") as f:
                f.write(driving_audio_bytes)

            # Determine audio duration using ffprobe
            duration = 5.0
            try:
                cmd_probe = [
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", temp_aud
                ]
                res = subprocess.run(cmd_probe, capture_output=True, text=True, check=True)
                duration = float(res.stdout.strip())
            except Exception as e:
                print(f"[HalloAdapter] [Simulation] ffprobe failed to get duration: {e}. Defaulting to 5.0 seconds.")

            try:
                # Generate a real, playable MP4 matching the exact audio length
                cmd = [
                    "ffmpeg", "-y",
                    "-loop", "1", "-framerate", "25", "-i", temp_img,
                    "-i", temp_aud,
                    "-c:v", "libx264",
                    "-profile:v", "baseline", "-level", "3.0",
                    "-c:a", "aac", "-b:a", "192k",
                    "-pix_fmt", "yuv420p",
                    "-t", f"{duration:.3f}",
                    temp_out
                ]
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if os.path.exists(temp_out):
                    print(f"[HalloAdapter] [Simulation] Playable video synthesized successfully. Path: {temp_out}")
                    with open(temp_out, "rb") as f:
                        return f.read()
            except Exception as e:
                print(f"[HalloAdapter] [Simulation] ffmpeg video generation failed: {e}. Falling back to hardcoded headers.")

            # Fallback to standard hardcoded MP4 file headers if ffmpeg fails
            return b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom' + b'\x00' * 10000
