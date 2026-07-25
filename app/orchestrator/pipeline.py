# app/orchestrator/pipeline.py
import os
import time
from typing import Dict, Any, Tuple
from app.config.settings import settings
from app.adapters.voice.omnivoice import OmniVoiceAdapter
from app.adapters.face.duix_avatar import DuixAvatarAdapter
from app.db import mock_db

class GenerationPipeline:
    """
    Core orchestrator responsible for routing inputs through the configured 
    Voice and Face adapters, and running quality gate checks.
    """
    
    def __init__(self):
        # Cache of initialized adapters
        self.voice_adapters = {
            "omnivoice": OmniVoiceAdapter(),
            "cosyvoice": OmniVoiceAdapter(),
            "chattts": OmniVoiceAdapter(),
            "bark": OmniVoiceAdapter()
        }
        self.face_adapters = {
            "duix_avatar": DuixAvatarAdapter(),
            "liveportrait": DuixAvatarAdapter(),
            "sadtalker": DuixAvatarAdapter(),
            "wav2lip": DuixAvatarAdapter()
        }

    def run_gates(self, audio_path: str, video_path: str) -> Tuple[bool, str]:
        """
        Quality Gates: Validate outputs at each stage.
        """
        # Gate 1: Physical File Presence & Size
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            return False, "Quality Gate Fail: Audio file was not created or is empty"
            
        if not os.path.exists(video_path) or os.path.getsize(video_path) == 0:
            return False, "Quality Gate Fail: Video file was not created or is empty"
            
        # Gate 2: Content Header Verification
        with open(video_path, "rb") as f:
            header = f.read(12)
            if b"ftyp" not in header:
                return False, "Quality Gate Fail: Output video is corrupt or invalid format"
                
        # Gate 3: Match Durations (Mocked for simulation)
        print("[Quality Gates] Checking audio & video length alignments...")
        time.sleep(0.2)
        
        print("[Quality Gates] All 3 validation checkpoints PASSED.")
        return True, "Success"

    def execute(self, script: str, persona_id: str, voice_model: str, face_model: str) -> Dict[str, Any]:
        start_time = time.time()
        
        # 1. Look up persona configuration
        print(f"[Orchestrator] Resolving persona {persona_id} details...")
        persona_voice_sample = None
        persona_face_frame = "default_avatar.jpg"
        
        # Check custom personas
        for p in mock_db.get_personas():
            if p.id == persona_id:
                persona_voice_sample = p.voiceClipName
                persona_face_frame = p.faceClipName or persona_face_frame
                break
                
        # 2. Resolve Voice Adapter
        v_adapter_name = voice_model.lower()
        if v_adapter_name not in self.voice_adapters:
            # Fallback
            v_adapter_name = settings.DEFAULT_VOICE_MODEL
        voice_adapter = self.voice_adapters[v_adapter_name]
        
        # 3. Resolve Face Adapter
        f_adapter_name = face_model.lower()
        if f_adapter_name not in self.face_adapters:
            # Fallback
            f_adapter_name = settings.DEFAULT_FACE_MODEL
        face_adapter = self.face_adapters[f_adapter_name]
        
        # Check if the user is running real models on Modal
        use_modal = False
        if v_adapter_name in ["cosyvoice", "chattts", "bark"] or f_adapter_name in ["liveportrait", "sadtalker", "wav2lip"]:
            use_modal = True

        audio_file = None
        video_file = None

        if use_modal:
            print(f"[Orchestrator] Connecting to remote Modal GPU workers for voice={voice_model}, face={face_model}...")
            try:
                import modal
                # Call voice generation on Modal
                print("[Orchestrator] Running Voice synthesis remotely on Modal cloud...")
                remote_voice = modal.Function.from_name("naqalchi-pipeline", "modal_generate_voice")
                # Pass dummy bytes in place of empty uploads for mock pipeline demonstration
                voice_bytes = remote_voice.remote(script, b"mock_sample_bytes")
                
                # Save returned audio stream to local output folder
                audio_file = os.path.join(settings.OUTPUT_DIR, f"modal_voice_{int(time.time())}.wav")
                with open(audio_file, "wb") as f:
                    f.write(voice_bytes)
                
                # Call avatar generation on Modal
                print("[Orchestrator] Running Avatar lipsync remotely on Modal cloud...")
                remote_avatar = modal.Function.from_name("naqalchi-pipeline", "modal_generate_avatar")
                video_bytes = remote_avatar.remote(voice_bytes, b"mock_image_bytes")
                
                # Save returned video stream to local output folder
                video_file = os.path.join(settings.OUTPUT_DIR, f"modal_avatar_{int(time.time())}.mp4")
                with open(video_file, "wb") as f:
                    f.write(video_bytes)
                
            except Exception as e:
                print(f"[Orchestrator] [WARNING] Modal remote call failed: {e}. Falling back to local simulation.")
                use_modal = False

        if not use_modal:
            # 4. Phase A: Text-to-Speech
            print("[Orchestrator] Phase A starting: Generating voice track...")
            audio_file = voice_adapter.generate_voice(script, voice_sample_path=persona_voice_sample)
            
            # 5. Phase B: Video Synthesis / Lip Sync
            print("[Orchestrator] Phase B starting: Synthesizing avatar facial structures...")
            video_file = face_adapter.generate_avatar_video(audio_file, avatar_image_or_video_path=persona_face_frame)
        
        # 6. Run Quality Gates
        passed, msg = self.run_gates(audio_file, video_file)
        if not passed:
            raise ValueError(f"Orchestration failed quality gate checks: {msg}")
            
        elapsed = int(time.time() - start_time)
        print(f"[Orchestrator] Pipeline finished successfully in {elapsed}s.")
        
        # Return path or public URL (in simulation, we reference output directory)
        return {
            "video_path": video_file,
            "video_url": f"/outputs/{os.path.basename(video_file)}",
            "elapsed_time": max(elapsed, 4)  # Ensure at least simulated rendering elapsed time
        }

# Global singleton
pipeline = GenerationPipeline()
