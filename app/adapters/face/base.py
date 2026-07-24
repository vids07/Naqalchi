# app/adapters/face/base.py
from abc import ABC, abstractmethod

class FaceAdapter(ABC):
    """
    Abstract Base Class representing the interface all face animation/lip-sync
    adapters must follow in Naqalchi.
    """
    
    @abstractmethod
    def __init__(self, checkpoint_path: str):
        """
        Initialize the model, load weights/checkpoints or instantiate API client.
        """
        pass
        
    @abstractmethod
    def generate_avatar_video(self, audio_path: str, avatar_image_or_video_path: str) -> str:
        """
        Animate an avatar image or video using a driving audio track.
        
        Args:
            audio_path: Path to the driving audio clip (synthesized voice).
            avatar_image_or_video_path: Path to the target avatar frame/photo to animate.
            
        Returns:
            str: Filepath to the output .mp4 file.
        """
        pass
