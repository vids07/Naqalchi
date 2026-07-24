# app/adapters/voice/base.py
from abc import ABC, abstractmethod

class VoiceAdapter(ABC):
    """
    Abstract Base Class representing the interface all voice cloning/synthesis
    adapters must follow in Naqalchi.
    """
    
    @abstractmethod
    def __init__(self, model_dir_or_api_key: str):
        """
        Initialize the model, load weights/checkpoints or instantiate API client.
        """
        pass
        
    @abstractmethod
    def generate_voice(self, text: str, voice_sample_path: str = None) -> str:
        """
        Synthesize text script to speech audio.
        
        Args:
            text: Script content to generate audio for.
            voice_sample_path: Path to reference short clip if executing zero-shot cloning.
            
        Returns:
            str: Filepath to the output .wav or .mp3 file.
        """
        pass
