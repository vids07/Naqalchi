import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  UserCheck,
  FileAudio,
  PanelLeft,
  PanelLeftClose,
  Mic,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Search,
  ShieldCheck
} from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  avatarUrl: string | null;
  voiceClipName: string | null;
  faceClipName: string | null;
}



const SYSTEM_STANDARD_PERSONA: Persona = {
  id: 'system-standard',
  name: 'Standard Presenter',
  avatarUrl: null,
  voiceClipName: 'standard_vocal_model.wav',
  faceClipName: null
};

export default function App() {
  // Navigation Tabs: 'voice-studio' or 'saved-voices'
  const [activeTab, setActiveTab] = useState<'voice-studio' | 'saved-voices'>('voice-studio');

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Saved Personas State
  const [personas, setPersonas] = useState<Persona[]>(() => {
    const saved = localStorage.getItem('naqalchi_production_personas');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Persist Personas
  useEffect(() => {
    localStorage.setItem('naqalchi_production_personas', JSON.stringify(personas));
  }, [personas]);

  // --- Step-By-Step Wizard State (Zero-Scroll Studio Console) ---
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1 State: Voice Source
  const [voiceSource, setVoiceSource] = useState<'upload' | 'record'>('upload');
  const [voiceFile, setVoiceFile] = useState<File | Blob | null>(null);
  const [voiceFileName, setVoiceFileName] = useState<string>('');
  
  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  // Consent Recording State
  const [consentFile, setConsentFile] = useState<File | Blob | null>(null);
  const [consentFileName, setConsentFileName] = useState<string>('');
  const [isRecordingConsent, setIsRecordingConsent] = useState<boolean>(false);
  const [consentDuration, setConsentDuration] = useState<number>(0);

  // Step 2 State: Voice Model selection
  const [voiceModel, setVoiceModel] = useState<string>('OmniVoice');
  const [modelSearch, setModelSearch] = useState<string>('');

  // Step 3 State: Sentences / Input
  const preWrittenSentences = [
    "I sound so good that I think I should start my own podcast, go on tour, and retire by next Tuesday.",
    "I can say absolutely anything you want me to say. Yes, even that embarrassing song you sing in the shower.",
    "The only way to do great work is to love what you do.",
    "Be yourself; everyone else is already taken.",
    "The best way to predict the future is to invent it. Let's build something incredible today."
  ];

  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(0);
  const [customText, setCustomText] = useState<string>('');

  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState<number>(0);
  const loadingPhrases = [
    "Spinning up your remote high-fidelity A10G GPU worker on Modal...",
    "Retrieving pristine 48kHz audio tensors for analysis...",
    "Whisper is transcribing your vocal pacing, breathing, and prosody...",
    "Constructing zero-shot speaker embeddings for cloning...",
    "Aligning pitch contours and phonetic characteristics...",
    "Synthesizing your custom script with your cloned voice...",
    "Mastering final acoustic rendering and streaming audio bytes back..."
  ];

  // Step 4 State: Loading / Result
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStage, setGenerationStage] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const stages = [
    { title: 'Acoustic Processing', desc: 'Analyzing vocal properties, pitch profiles, and voice boundaries...' },
    { title: 'Neural Synthesis', desc: 'Running speech synthesis on your cloned vocal tracks...' },
    { title: 'Quality Validation Check', desc: 'Aligning decibels and generating real studio audio track...' }
  ];

  const [generationResult, setGenerationResult] = useState<{
    id: string;
    script: string;
    persona: Persona;
    voiceModel: string;
    videoUrl: string;
  } | null>(null);

  // Saved voice details
  const [saveAsPersona, setSaveAsPersona] = useState<boolean>(false);
  const [personaName, setPersonaName] = useState<string>('');
  const [isSavingPersona, setIsSavingPersona] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activePersonaId, setActivePersonaId] = useState<string>('');

  const [previewingPersona, setPreviewingPersona] = useState<Persona | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string>('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [personaSpeed, setPersonaSpeed] = useState<number>(1.0);
  const [personaPitch, setPersonaPitch] = useState<number>(1.0);
  const [personaModel, setPersonaModel] = useState<string>('CosyVoice-300M');

  useEffect(() => {
    if (previewAudioUrl) {
      const audio = new Audio(previewAudioUrl);
      previewAudioRef.current = audio;
      audio.onended = () => setIsPreviewPlaying(false);
      return () => {
        audio.pause();
        previewAudioRef.current = null;
        setIsPreviewPlaying(false);
      };
    }
  }, [previewAudioUrl]);

  const togglePreviewPlayback = () => {
    if (previewAudioRef.current) {
      if (isPreviewPlaying) {
        previewAudioRef.current.pause();
        setIsPreviewPlaying(false);
      } else {
        previewAudioRef.current.play().catch(err => console.warn("Failed to play preview", err));
        setIsPreviewPlaying(true);
      }
    }
  };

  useEffect(() => {
    if (!activePersonaId && personas.length > 0) {
      const prince = personas.find(p => p.name.toLowerCase() === 'prince');
      if (prince) {
        setActivePersonaId(prince.id);
      } else {
        setActivePersonaId(personas[0].id);
      }
    }
  }, [personas, activePersonaId]);



  // Waveform canvas & audio recording elements
  const oscillogramRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string>('');
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState<boolean>(false);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const consentMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const consentRecordedChunksRef = useRef<Blob[]>([]);
  const [consentAudioUrl, setConsentAudioUrl] = useState<string>('');
  const [isConsentPlaybackPlaying, setIsConsentPlaybackPlaying] = useState<boolean>(false);
  const consentPlaybackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const resultAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (generationResult && generationResult.audioUrl) {
      const audio = new Audio(generationResult.audioUrl);
      resultAudioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      return () => {
        audio.pause();
        resultAudioRef.current = null;
        setIsPlaying(false);
      };
    }
  }, [generationResult]);

  useEffect(() => {
    if (resultAudioRef.current) {
      if (isPlaying) {
        resultAudioRef.current.play().catch(err => {
          console.warn("Audio playback failed", err);
          setIsPlaying(false);
        });
      } else {
        resultAudioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Recording timer tracker
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Consent Recording timer tracker
  useEffect(() => {
    let timer: any;
    if (isRecordingConsent) {
      timer = setInterval(() => {
        setConsentDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecordingConsent]);

  // Handle generation ticks & phrase rotation
  useEffect(() => {
    let interval: any;
    let phraseTimer: any;
    if (isGenerating) {
      setLoadingPhraseIndex(0);
      phraseTimer = setInterval(() => {
        setLoadingPhraseIndex(prev => (prev + 1) % loadingPhrases.length);
      }, 2500);

      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setGenerationProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          const next = prev + (100 / 15); // Smooth simulated progress bar
          if (next < 33) setGenerationStage(0);
          else if (next < 75) setGenerationStage(1);
          else setGenerationStage(2);
          return next > 100 ? 100 : next;
        });
      }, 1000);
    } else {
      setElapsedTime(0);
      setGenerationProgress(0);
      setGenerationStage(0);
    }
    return () => {
      clearInterval(interval);
      clearInterval(phraseTimer);
    };
  }, [isGenerating]);

  const stopPlayback = () => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
    setIsPlaybackPlaying(false);
  };

  const togglePlayback = () => {
    if (!recordedAudioUrl) return;
    if (isPlaybackPlaying) {
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
      }
      setIsPlaybackPlaying(false);
    } else {
      if (playbackAudioRef.current) {
        playbackAudioRef.current.play().then(() => {
          setIsPlaybackPlaying(true);
        }).catch(err => console.error("Playback failed", err));
      } else {
        const audio = new Audio(recordedAudioUrl);
        audio.onended = () => {
          setIsPlaybackPlaying(false);
        };
        playbackAudioRef.current = audio;
        audio.play().then(() => {
          setIsPlaybackPlaying(true);
        }).catch(err => console.error("Playback failed", err));
      }
    }
  };

  const discardRecording = () => {
    stopPlayback();
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl('');
    }
    setVoiceFile(null);
    setVoiceFileName('');
  };

  // Clean up recording context
  const releaseMediaStreams = () => {
    stopPlayback();
    stopConsentPlayback();
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl('');
    }
    if (consentAudioUrl) {
      URL.revokeObjectURL(consentAudioUrl);
      setConsentAudioUrl('');
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const stopConsentPlayback = () => {
    if (consentPlaybackAudioRef.current) {
      consentPlaybackAudioRef.current.pause();
      consentPlaybackAudioRef.current = null;
    }
    setIsConsentPlaybackPlaying(false);
  };

  const toggleConsentPlayback = () => {
    if (!consentAudioUrl) return;
    if (isConsentPlaybackPlaying) {
      if (consentPlaybackAudioRef.current) {
        consentPlaybackAudioRef.current.pause();
      }
      setIsConsentPlaybackPlaying(false);
    } else {
      if (consentPlaybackAudioRef.current) {
        consentPlaybackAudioRef.current.play().then(() => {
          setIsConsentPlaybackPlaying(true);
        }).catch(err => console.error("Consent playback failed", err));
      } else {
        const audio = new Audio(consentAudioUrl);
        audio.onended = () => {
          setIsConsentPlaybackPlaying(false);
        };
        consentPlaybackAudioRef.current = audio;
        audio.play().then(() => {
          setIsConsentPlaybackPlaying(true);
        }).catch(err => console.error("Consent playback failed", err));
      }
    }
  };

  const discardConsentRecording = () => {
    stopConsentPlayback();
    if (consentAudioUrl) {
      URL.revokeObjectURL(consentAudioUrl);
      setConsentAudioUrl('');
    }
    setConsentFile(null);
    setConsentFileName('');
  };

  const startConsentRecording = () => {
    if (!mediaStreamRef.current) {
      initiateMicrophone().then(() => {
        if (mediaStreamRef.current) {
          startConsentMediaRecorder();
        }
      });
    } else {
      startConsentMediaRecorder();
    }
  };

  const startConsentMediaRecorder = () => {
    if (!mediaStreamRef.current) return;
    consentRecordedChunksRef.current = [];
    try {
      const options = { mimeType: 'audio/webm' };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(mediaStreamRef.current, options);
      } catch (e) {
        recorder = new MediaRecorder(mediaStreamRef.current);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          consentRecordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(consentRecordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setConsentFile(recordedBlob);
        const fileName = `recorded_consent_${Math.floor(Math.random() * 900) + 100}.wav`;
        setConsentFileName(fileName);

        if (consentAudioUrl) {
          URL.revokeObjectURL(consentAudioUrl);
        }
        const url = URL.createObjectURL(recordedBlob);
        setConsentAudioUrl(url);
      };

      consentMediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecordingConsent(true);
      setConsentDuration(0);
    } catch (err) {
      console.error("Failed to start Consent MediaRecorder", err);
    }
  };

  const stopConsentRecording = () => {
    if (consentMediaRecorderRef.current && consentMediaRecorderRef.current.state !== 'inactive') {
      consentMediaRecorderRef.current.stop();
    }
    setIsRecordingConsent(false);
  };

  const initiateMicrophone = async () => {
    releaseMediaStreams();
    try {
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
       mediaStreamRef.current = stream;

       const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
       const audioCtx = new AudioCtx();
       const analyser = audioCtx.createAnalyser();
       analyser.fftSize = 128;
      
       const source = audioCtx.createMediaStreamSource(stream);
       source.connect(analyser);
      
       audioContextRef.current = audioCtx;
       analyserRef.current = analyser;
    } catch (err) {
       console.warn("Microphone not found or denied, entering wave simulation", err);
    }
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) {
      initiateMicrophone().then(() => {
        if (mediaStreamRef.current) {
          startMediaRecorder();
        }
      });
    } else {
      startMediaRecorder();
    }
  };

  const startMediaRecorder = () => {
    if (!mediaStreamRef.current) return;
    recordedChunksRef.current = [];
    try {
      const options = { mimeType: 'audio/webm' };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(mediaStreamRef.current, options);
      } catch (e) {
        recorder = new MediaRecorder(mediaStreamRef.current);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setVoiceFile(recordedBlob);
        const fileName = `recorded_vocal_${Math.floor(Math.random() * 900) + 100}.wav`;
        setVoiceFileName(fileName);

        if (recordedAudioUrl) {
          URL.revokeObjectURL(recordedAudioUrl);
        }
        const url = URL.createObjectURL(recordedBlob);
        setRecordedAudioUrl(url);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (err) {
      console.error("Failed to start MediaRecorder", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Waveform canvas rendering
  useEffect(() => {
    if (voiceSource !== 'record' || !oscillogramRef.current) return;
    const canvas = oscillogramRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f5faf8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#3c5c56';
      ctx.beginPath();

      if (analyserRef.current && isRecording) {
        analyserRef.current.getByteTimeDomainData(dataArray);
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
      } else {
        // Simulated idle/recording wave
        const sliceWidth = canvas.width / 80;
        let x = 0;
        const amplitude = isRecording ? 20 : 4;
        const speed = isRecording ? 0.2 : 0.05;

        for (let i = 0; i <= 80; i++) {
          const angle = (i * 0.2) + (Date.now() * speed);
          const y = (canvas.height / 2) + Math.sin(angle) * Math.cos(angle * 0.4) * amplitude;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [voiceSource, isRecording]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVoiceFile(file);
      setVoiceFileName(file.name);
    }
  };

  const handleCloneAndSpeak = async () => {
    let activeVoiceFile = voiceFile;
    let activeVoiceFileName = voiceFileName;

    if (activePersonaId && !voiceFile) {
      try {
        const res = await fetch(`http://localhost:8000/api/personas/${activePersonaId}/preview`);
        if (res.ok) {
          const blob = await res.blob();
          activeVoiceFile = blob;
          activeVoiceFileName = "reference.wav";
        }
      } catch (e) {
        console.error("Failed to fetch reference audio from server", e);
      }
    }

    if (!activeVoiceFile) {
      alert("Please upload or record a reference voice first.");
      return;
    }
    
    setIsGenerating(true);
    setGenerationProgress(0);
    setElapsedTime(0);
    setGenerationResult(null);
    setSaveAsPersona(false);
    setPersonaName('');
    setSaveSuccess(false);

    const activeScript = selectedPresetIndex !== null ? preWrittenSentences[selectedPresetIndex] : customText;

    try {
      const formData = new FormData();
      if (activeVoiceFile instanceof File) {
        formData.append("reference_audio", activeVoiceFile);
      } else {
        const recordedFile = new File([activeVoiceFile], activeVoiceFileName || "recorded_vocal.wav", { type: "audio/wav" });
        formData.append("reference_audio", recordedFile);
      }
      formData.append("text", activeScript);

      const response = await fetch("http://localhost:8000/api/voice/synthesize", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Synthesis backend returned status ${response.status}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      
      setGenerationResult({
        id: Math.random().toString(36).substring(2, 9),
        script: activeScript,
        audioUrl: audioUrl,
        persona: {
          id: 'temp-' + Math.random().toString(36).substring(2, 9),
          name: `Voice Clone - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
          avatarUrl: null,
          voiceClipName: voiceFileName || "recorded_vocal.wav",
          faceClipName: null
        },
        voiceModel: voiceModel,
        videoUrl: '#'
      });

      setCurrentStep(4);
    } catch (err) {
      console.error("Voice synthesis failed:", err);
      alert(`Synthesis failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToRoster = async () => {
    if (!generationResult || !personaName.trim()) return;
    setIsSavingPersona(true);
    try {
      const formData = new FormData();
      formData.append("name", personaName);

      // 1. Append original reference voice clip
      if (voiceFile instanceof File) {
        formData.append("voice_clip", voiceFile);
      } else if (voiceFile) {
        const recordedFile = new File([voiceFile], voiceFileName || "recorded_vocal.wav", { type: "audio/wav" });
        formData.append("voice_clip", recordedFile);
      }

      // 2. Fetch the generated audio blob and append as preview.wav
      if (generationResult.audioUrl) {
        const audioRes = await fetch(generationResult.audioUrl);
        const audioBlob = await audioRes.blob();
        const previewFile = new File([audioBlob], "preview.wav", { type: "audio/wav" });
        formData.append("preview_clip", previewFile);
      }

      const response = await fetch("http://localhost:8000/api/personas", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const savedPersona: Persona = await response.json();

      // 3. Update local personas roster state with backend response
      setPersonas(prev => [...prev, savedPersona]);
      setSaveSuccess(true);
    } catch (err) {
      console.error("Failed to save persona:", err);
      alert(`Failed to save persona: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingPersona(false);
    }
  };

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* SaaS Sidebar Layout */}
      <aside className="app-sidebar">
        <div className="brand-section">
          <div className="brand-logo">
            <svg viewBox="0 0 100 100" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="spadeAuraGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00f5c4" stopOpacity="1" />
                  <stop offset="40%" stopColor="#00b894" stopOpacity="1" />
                  <stop offset="80%" stopColor="#008066" stopOpacity="1" />
                  <stop offset="100%" stopColor="#005c4d" stopOpacity="1" />
                </radialGradient>
              </defs>
              <rect width="100" height="100" fill="url(#spadeAuraGlow)" />
              <path d="M50 15C47 15 22 36 22 52C22 61 29 65 39.5 65C44 65 47.5 63 50 60C52.5 63 56 65 60.5 65C71 65 78 61 78 52C78 36 53 15 50 15Z" fill="#060c0b" />
              <path d="M50 56Q48 65 44 76.5H56Q52 65 50 56Z" fill="#060c0b" />
            </svg>
          </div>
          <div className="brand-info">
            <h1>Naqalchi</h1>
            <p>AI CREATIVE SUITE</p>
          </div>
          <button 
            className="btn-collapse-sidebar"
            onClick={() => setIsSidebarCollapsed(true)}
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-tab ${activeTab === 'voice-studio' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('voice-studio');
              setCurrentStep(1);
              setGenerationResult(null);
            }}
          >
            <Mic size={18} />
            Voice Studio
          </button>
          <button 
            className={`nav-tab ${activeTab === 'saved-voices' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved-voices')}
          >
            <UserCheck size={18} />
            Manage Personas
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar" style={{ background: 'var(--accent-dark)', color: '#ffffff' }}>AD</div>
            <div className="user-meta">
              <h4>Admin Studio</h4>
              <p>INTERNAL ACCOUNT</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="main-content">
        {isSidebarCollapsed && (
          <header className="top-header" style={{ padding: '12px 32px', height: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                className="btn-expand-sidebar"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expand sidebar"
              >
                <PanelLeft size={20} />
              </button>
            </div>
          </header>
        )}

        {/* VIEW 1: VOICE STUDIO (Zero-Scroll Stepper Studio Console) */}
        {activeTab === 'voice-studio' && (
          <div className="persona-admin-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="persona-admin-header" style={{ marginBottom: '64px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: '700' }}>Instant Voice Cloning</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Clone reference voice clips and generate custom narrated scripts.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexGrow: 1, paddingBottom: '40px' }}>
              <div 
                className="studio-console-card" 
                style={{
                  width: '100%',
                  maxWidth: '720px',
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-premium)',
                  padding: '36px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '480px',
                  maxHeight: '85vh',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
              {/* Stepper Progress Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                {[
                  { step: 1, label: 'Voice Sample' },
                  { step: 2, label: 'Vocal Model' },
                  { step: 3, label: 'Script Text' },
                  { step: 4, label: 'Synthesis' }
                ].map((st) => (
                  <div key={st.step} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: st.step < 4 ? 1 : 'none' }}>
                    <div 
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: currentStep >= st.step ? 'var(--accent-dark)' : 'rgba(15,28,26,0.06)',
                        color: currentStep >= st.step ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      {currentStep > st.step ? <CheckCircle2 size={14} /> : st.step}
                    </div>
                    <span 
                      style={{ 
                        fontFamily: 'var(--font-title)',
                        fontSize: '13px', 
                        fontWeight: currentStep === st.step ? 700 : 500, 
                        color: currentStep === st.step ? 'var(--text-dark)' : 'var(--text-muted)'
                      }}
                    >
                      {st.label}
                    </span>
                    {st.step < 4 && (
                      <div 
                        style={{
                          height: '2px',
                          background: currentStep > st.step ? 'var(--accent-dark)' : 'rgba(15,28,26,0.06)',
                          flex: 1,
                          margin: '0 12px',
                          transition: 'var(--transition-smooth)'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content Panels */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                
                {/* FUN INTERACTIVE OVERLAY LOADER */}
                {isGenerating && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255, 255, 255, 0.98)',
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    borderRadius: '12px',
                    backdropFilter: 'blur(8px)',
                    transition: 'var(--transition-smooth)'
                  }}>
                    {/* Glowing Audio wave animation */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', height: '60px', marginBottom: '24px' }}>
                      {[0.6, 1.2, 0.4, 1.5, 0.8, 1.3, 0.5, 1.1, 0.7, 1.4].map((delay, index) => (
                        <div 
                          key={index}
                          style={{
                            width: '4px',
                            height: '100%',
                            background: 'var(--accent-dark)',
                            borderRadius: '2px',
                            animation: `soundWave 1.2s ease-in-out infinite alternate`,
                            animationDelay: `${delay}s`,
                            transformOrigin: 'bottom'
                          }}
                        />
                      ))}
                    </div>

                    <style>{`
                      @keyframes soundWave {
                        0% { transform: scaleY(0.15); }
                        100% { transform: scaleY(1.0); }
                      }
                      @keyframes subtleSpin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>

                    <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 size={20} style={{ animation: 'subtleSpin 1.8s linear infinite', color: 'var(--accent-dark)' }} />
                      Synthesizing Vocal Magic...
                    </h3>

                    {/* Progress Bar Container */}
                    <div style={{ width: '80%', maxWidth: '320px', background: 'rgba(60, 92, 86, 0.1)', height: '6px', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{ width: `${generationProgress}%`, height: '100%', background: 'var(--accent-dark)', transition: 'width 0.3s ease-out', borderRadius: '10px' }} />
                    </div>

                    {/* Dynamic Rotating Fun Phrase */}
                    <p style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--accent-dark)',
                      textAlign: 'center',
                      maxWidth: '420px',
                      minHeight: '36px',
                      lineHeight: '1.4',
                      padding: '8px 16px',
                      background: 'var(--accent-light)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(60, 92, 86, 0.04)'
                    }}>
                      💡 {loadingPhrases[loadingPhraseIndex]}
                    </p>

                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      Elapsed: {elapsedTime}s
                    </span>
                  </div>
                )}
                
                {/* STEP 1: Voice Sample Intake */}
                {currentStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>How would you like to provide the reference voice?</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Provide a short sample (10s to 30s) of the voice you want to clone.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', background: 'rgba(15,28,26,0.03)', padding: '4px', borderRadius: '10px', width: '280px', margin: '0 auto' }}>
                      <button 
                        type="button" 
                        onClick={() => { setVoiceSource('upload'); releaseMediaStreams(); }}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none', background: voiceSource === 'upload' ? '#ffffff' : 'transparent', color: 'var(--text-dark)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                      >
                        Upload Audio
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setVoiceSource('record'); initiateMicrophone(); }}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none', background: voiceSource === 'record' ? '#ffffff' : 'transparent', color: 'var(--text-dark)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                      >
                        Record Live
                      </button>
                    </div>

                    {voiceSource === 'upload' ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <input 
                          type="file" 
                          accept="audio/wav,audio/mp3,audio/mpeg" 
                          id="console-upload-file"
                          style={{ display: 'none' }}
                          onChange={handleFileUpload}
                        />
                        {voiceFileName ? (
                          <div 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: '1px solid var(--border-color)',
                              borderRadius: '14px',
                              padding: '16px 20px',
                              background: 'var(--accent-light)',
                              boxShadow: '0 2px 8px rgba(15, 28, 26, 0.02)',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'var(--bg-pill-active)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent-dark)'
                              }}>
                                <FileAudio size={18} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-dark)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {voiceFileName}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Reference file loaded successfully
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setVoiceFile(null);
                                setVoiceFileName('');
                                const fileInput = document.getElementById('console-upload-file') as HTMLInputElement;
                                if (fileInput) fileInput.value = '';
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: '1px solid rgba(232, 65, 24, 0.1)',
                                background: 'rgba(232, 65, 24, 0.04)',
                                color: '#e84118',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              title="Delete reference file"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <label 
                            htmlFor="console-upload-file"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px dashed rgba(15,28,26,0.15)',
                              borderRadius: '14px',
                              padding: '36px 20px',
                              background: '#fcfdfd',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            <FileAudio size={28} style={{ color: 'var(--accent-dark)', marginBottom: '10px' }} />
                            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)' }}>
                              Click to select reference audio file
                            </span>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              Supports high-quality WAV or MP3 audio
                            </p>
                          </label>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {isRecording ? (
                          /* Stage 1: Active Recording with Oscillogram */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#fcfdfd', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
                            <canvas 
                              ref={oscillogramRef} 
                              width={400}
                              height={50}
                              style={{ width: '100%', height: '50px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                              <button 
                                type="button"
                                onClick={stopRecording}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: '#e84118',
                                  color: '#ffffff',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'var(--transition-smooth)'
                                }}
                                title="Stop Recording"
                              >
                                <div style={{ width: '12px', height: '12px', background: '#ffffff', borderRadius: '2px' }} />
                              </button>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#e84118' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e84118' }} />
                                Recording: {recordingDuration}s
                              </div>
                            </div>
                          </div>
                        ) : voiceFileName ? (
                          /* Stage 2: Captured Recording with Playback & Delete */
                          <div 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: '1px solid var(--border-color)',
                              borderRadius: '14px',
                              padding: '16px 20px',
                              background: 'var(--accent-light)',
                              boxShadow: '0 2px 8px rgba(15, 28, 26, 0.02)',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <button
                                type="button"
                                onClick={togglePlayback}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  background: 'var(--bg-pill-active)',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--accent-dark)',
                                  cursor: 'pointer',
                                  paddingLeft: isPlaybackPlaying ? '0px' : '2px',
                                  transition: 'var(--transition-smooth)'
                                }}
                                title={isPlaybackPlaying ? "Pause Playback" : "Play Recording"}
                              >
                                {isPlaybackPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                              </button>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <span style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                                  {voiceFileName}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Recording captured successfully • {recordingDuration}s
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={discardRecording}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: '1px solid rgba(232, 65, 24, 0.1)',
                                background: 'rgba(232, 65, 24, 0.04)',
                                color: '#e84118',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              title="Delete recording"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          /* Stage 3: Ready to Record State (Idle) */
                          <div 
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid var(--border-color)',
                              borderRadius: '14px',
                              padding: '30px 20px',
                              background: '#fcfdfd',
                              textAlign: 'center'
                            }}
                          >
                            <button 
                              type="button"
                              onClick={startRecording}
                              style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: 'var(--accent-dark)',
                                color: '#ffffff',
                                border: 'none',
                                display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  marginBottom: '12px',
                                  transition: 'var(--transition-smooth)',
                                  boxShadow: '0 4px 14px rgba(60, 92, 86, 0.25)'
                                }}
                                title="Start Recording"
                              >
                                <Mic size={24} />
                              </button>
                              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)' }}>
                                Ready to record reference voice
                              </span>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4', whiteSpace: 'nowrap' }}>
                                Speak clearly into your microphone. Recommended length is 10 to 30 seconds.
                              </p>
                            </div>
                          )}
                        </div>
                      )}


                  </div>
                )}

                {/* STEP 2: Choose Vocal Model */}
                {currentStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>Select Vocal Engine Model</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Choose the AI voice synthesis model that matches your script style.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', minHeight: '260px' }}>
                      {/* Left: Scrollable List Panel with Search */}
                      <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', gap: '10px', borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
                        {/* Compact Search Box */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            placeholder="Search vocal engines..." 
                            value={modelSearch}
                            onChange={(e) => setModelSearch(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px 8px 30px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: '#fcfdfd',
                              fontSize: '12px',
                              outline: 'none',
                              color: 'var(--text-dark)'
                            }}
                          />
                          <Search size={13} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                        </div>

                        {/* Model Scrollable Rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '210px', paddingRight: '4px' }}>
                          {[
                            { name: 'OmniVoice', tag: 'Active', desc: 'Superb high-fidelity zero-shot vocal cloning powered by OmniVoice running on remote cloud GPUs. Delivers pristine vocal similarity and ultra-natural speed, cadence, and tonal preservation.', speed: 95, naturalness: 99, latency: 'Low (0.7s)' }
                          ]
                            .filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.tag.toLowerCase().includes(modelSearch.toLowerCase()))
                            .map((model) => (
                              <div 
                                key={model.name}
                                onClick={() => setVoiceModel(model.name)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  border: voiceModel === model.name ? '1.5px solid var(--accent-dark)' : '1px solid var(--border-color)',
                                  background: voiceModel === model.name ? 'var(--bg-pill-hover)' : '#ffffff',
                                  cursor: 'pointer',
                                  transition: 'var(--transition-smooth)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    border: voiceModel === model.name ? '4px solid var(--accent-dark)' : '1.5px solid var(--border-color)',
                                    background: '#ffffff',
                                    transition: 'var(--transition-smooth)'
                                  }} />
                                  <span style={{ fontFamily: 'var(--font-title)', fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', letterSpacing: '-0.01em' }}>
                                    {model.name}
                                  </span>
                                </div>
                                <span style={{ fontSize: '9px', fontWeight: 700, background: 'rgba(60, 92, 86, 0.1)', color: 'var(--accent-dark)', padding: '2px 6px', borderRadius: '20px' }}>
                                  {model.tag}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Right: Rich Engine Intelligence Panel */}
                      <div style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', background: 'var(--accent-light)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                        {(() => {
                          const modelsList = [
                            { name: 'OmniVoice', tag: 'Active', desc: 'Superb high-fidelity zero-shot vocal cloning powered by OmniVoice running on remote cloud GPUs. Delivers pristine vocal similarity and ultra-natural speed, cadence, and tonal preservation.', speed: 95, naturalness: 99, latency: 'Low (0.7s)' }
                          ];
                          const activeModel = modelsList.find(m => m.name === voiceModel) || modelsList[0];
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '10px' }}>
                                <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>
                                  {activeModel.name}
                                </h4>
                                <span style={{ fontSize: '9px', fontWeight: 700, background: 'var(--bg-pill-active)', color: 'var(--text-dark)', padding: '2px 6px', borderRadius: '20px' }}>
                                  {activeModel.tag}
                                </span>
                              </div>

                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', flexGrow: 1, minHeight: '44px', margin: 0 }}>
                                {activeModel.desc}
                              </p>

                              {/* Parameter Performance Metrics */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', background: '#ffffff', borderRadius: '8px', padding: '10px', border: '1px solid var(--border-color)' }}>
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '3px' }}>
                                    <span>Synthesis Speed</span>
                                    <span>{activeModel.speed}%</span>
                                  </div>
                                  <div style={{ width: '100%', height: '4px', background: 'rgba(15,28,26,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ width: `${activeModel.speed}%`, height: '100%', background: 'var(--accent-dark)', borderRadius: '10px', transition: 'width 0.3s ease' }} />
                                  </div>
                                </div>

                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '3px' }}>
                                    <span>Audio Naturalness</span>
                                    <span>{activeModel.naturalness}%</span>
                                  </div>
                                  <div style={{ width: '100%', height: '4px', background: 'rgba(15,28,26,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ width: `${activeModel.naturalness}%`, height: '100%', background: 'var(--accent-dark)', borderRadius: '10px', transition: 'width 0.3s ease' }} />
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, color: 'var(--text-dark)', paddingTop: '4px', borderTop: '1px solid rgba(15,28,26,0.04)' }}>
                                  <span>Engine Latency</span>
                                  <span style={{ color: 'var(--accent-dark)' }}>{activeModel.latency}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Choose or Write Script */}
                {currentStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                      {activePersonaId && (
                        <div style={{
                          background: 'var(--accent-light)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          width: 'fit-content',
                          margin: '0 auto 12px auto',
                          fontSize: '12px',
                          color: 'var(--text-dark)',
                          fontWeight: 600,
                          animation: 'fadeIn 0.2s ease'
                        }}>
                          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#00b894' }}></span>
                          Cloning voice: <strong style={{ color: 'var(--accent-dark)' }}>{personas.find(p => p.id === activePersonaId)?.name || 'Custom Persona'}</strong>
                        </div>
                      )}
                      <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>What should your cloned voice say?</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Pick one of our curated sentences or write your own custom script below.</p>
                    </div>

                    {/* Pre-written sentence chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                      {preWrittenSentences.map((sentence, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedPresetIndex(idx);
                            setCustomText('');
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: selectedPresetIndex === idx ? '1px solid var(--accent-dark)' : '1px solid var(--border-color)',
                            background: selectedPresetIndex === idx ? 'var(--accent-dark)' : 'transparent',
                            color: selectedPresetIndex === idx ? '#ffffff' : 'var(--text-dark)',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)',
                            whiteSpace: 'nowrap',
                            maxWidth: '240px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={sentence}
                        >
                          {idx === 0 ? "🎙️ Podcast" : idx === 1 ? "🚿 Shower Song" : idx === 2 ? "❤️ Great Work" : idx === 3 ? "✨ Be Yourself" : "🚀 Invent Future"}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPresetIndex(null);
                          if (!customText) setCustomText("Enter your custom script text here.");
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          border: selectedPresetIndex === null ? '1px solid var(--accent-dark)' : '1px solid var(--border-color)',
                          background: selectedPresetIndex === null ? 'var(--accent-dark)' : 'transparent',
                          color: selectedPresetIndex === null ? '#ffffff' : 'var(--text-dark)',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        📝 Custom Script
                      </button>
                    </div>


                    {/* Script Editor Canvas */}
                    <div style={{ position: 'relative' }}>
                      <textarea
                        className="script-textarea"
                        placeholder="Type what your cloned voice should say..."
                        value={selectedPresetIndex !== null ? preWrittenSentences[selectedPresetIndex] : customText}
                        onChange={(e) => {
                          setSelectedPresetIndex(null);
                          setCustomText(e.target.value);
                        }}
                        style={{
                          width: '100%',
                          height: '90px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)',
                          padding: '14px',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          resize: 'none',
                          background: '#fcfdfd',
                          outline: 'none'
                        }}
                      />
                      <span style={{ position: 'absolute', bottom: '10px', right: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {(selectedPresetIndex !== null ? preWrittenSentences[selectedPresetIndex] : customText).length} characters
                      </span>
                    </div>
                  </div>
                )}

                {/* STEP 4: Synthesis & Playback Output */}
                {currentStep === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                    
                    {/* Loader view */}
                    {isGenerating && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
                        <div className="progress-circular-container">
                          <svg className="progress-circle-svg">
                            <circle className="progress-circle-bg" cx="70" cy="70" r="55"></circle>
                            <circle 
                              className="progress-circle-fill" 
                              cx="70" 
                              cy="70" 
                              r="55"
                              style={{
                                strokeDasharray: 345,
                                strokeDashoffset: 345 - (345 * generationProgress) / 100
                              }}
                            ></circle>
                          </svg>
                          <div className="timer-display" style={{ fontSize: '14px' }}>{elapsedTime}s</div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>{stages[generationStage].title}</h4>
                          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{stages[generationStage].desc}</p>
                        </div>
                      </div>
                    )}

                    {/* Result view */}
                    {!isGenerating && generationResult && (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        
                        <div style={{ background: 'var(--accent-light)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'var(--accent-dark)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                          </button>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <span style={{ fontFamily: 'var(--font-title)', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', display: 'block' }}>Your Cloned Voice Clip</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                              "{generationResult.script}"
                            </span>
                          </div>
                        </div>

                        {/* Save to library options */}
                        <div style={{ borderTop: '1px solid rgba(15,28,26,0.06)', paddingTop: '12px' }}>
                          {!saveSuccess ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={saveAsPersona} 
                                  onChange={(e) => setSaveAsPersona(e.target.checked)}
                                  style={{ width: '15px', height: '15px', accentColor: 'var(--accent-dark)' }}
                                />
                                <span style={{ fontFamily: 'var(--font-title)', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-dark)' }}>
                                  Save voice as permanent Persona to library?
                                </span>
                              </label>

                              {saveAsPersona && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                  <input 
                                    type="text"
                                    placeholder="Name this voice (e.g. My Narrator Voice)"
                                    value={personaName}
                                    onChange={(e) => setPersonaName(e.target.value)}
                                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12.5px', outline: 'none' }}
                                  />
                                  <button 
                                    onClick={handleSaveToRoster}
                                    disabled={!personaName.trim() || isSavingPersona}
                                    style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--accent-dark)', color: 'white', border: 'none', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    {isSavingPersona ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'var(--accent-light)', border: '1px solid var(--border-color)', color: 'var(--accent-dark)', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, width: '100%', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(18, 60, 52, 0.02)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={16} style={{ color: 'var(--accent-dark)' }} />
                                <span style={{ fontFamily: 'var(--font-title)', fontWeight: 600 }}>Successfully saved voice to library database!</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setActiveTab('saved-voices')}
                                style={{
                                  background: 'transparent',
                                  color: 'var(--accent-dark)',
                                  border: 'none',
                                  padding: '4px 8px',
                                  fontSize: '12.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  textDecoration: 'underline',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                View in Manage Personas →
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Navigation Actions Footer */}
              {!isGenerating && (
                <div style={{ display: 'flex', justifyContent: currentStep === 4 ? 'flex-end' : 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '16px' }}>
                  {currentStep !== 4 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep(prev => prev - 1);
                      }}
                      disabled={currentStep === 1}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'transparent',
                        color: 'var(--text-dark)',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        opacity: currentStep === 1 ? 0.3 : 1,
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <ChevronLeft size={16} /> Back
                    </button>
                  )}

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => prev + 1)}
                      disabled={currentStep === 1 && !voiceFile}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--accent-dark)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        opacity: currentStep === 1 && !voiceFile ? 0.4 : 1,
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  ) : currentStep === 3 ? (
                    <button
                      type="button"
                      onClick={handleCloneAndSpeak}
                      disabled={(!customText.trim() && selectedPresetIndex === null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--accent-dark)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        opacity: (!customText.trim() && selectedPresetIndex === null) ? 0.6 : 1,
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <Sparkles size={16} /> Clone & Speak!
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setGenerationResult(null);
                        setSaveSuccess(false);
                        setCurrentStep(1);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--accent-dark)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <RotateCcw size={16} /> Clone Another Voice
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
          </div>
        )}

        {/* VIEW 2: SAVED VOICES / ROSTER */}
        {activeTab === 'saved-voices' && (
          <div className="persona-admin-container">
            <div className="persona-admin-header" style={{ marginBottom: '64px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: '700' }}>Manage Team Personas</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Clone, replace, and audit voice/visual references used to synthesize videos.
                </p>
              </div>
              <button 
                className="btn-primary-small"
                onClick={() => {
                  setActiveTab('voice-studio');
                  setCurrentStep(1);
                  setGenerationResult(null);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                Create Persona
              </button>
            </div>

            {personas.length === 0 ? (
              <div 
                className="generation-card"
                style={{ minHeight: '300px', background: 'var(--accent-light)' }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                <div>
                  <h3 className="stage-title">Start Cloning Personas</h3>
                  <p className="stage-desc" style={{ marginTop: '4px' }}>Add reference files to populate your studio roster.</p>
                </div>
                <button 
                  type="button" 
                  className="btn-primary-small"
                  style={{ padding: '10px 20px' }}
                  onClick={() => {
                    setActiveTab('voice-studio');
                    setCurrentStep(1);
                  }}
                >
                  + Add First Persona
                </button>
              </div>
            ) : (
              <div className="persona-admin-grid">
                {(() => {
                  let lastColorIndex = -1;
                  return personas.map((persona, index) => {
                    const initials = persona.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    const isActive = activePersonaId === persona.id;

                    // 5 ultra-premium pastel gradients: Lavender, Mint-Green, Ice-Blue, Dusty Peach, Champagne-Grey
                    const gradients = [
                      { bg: 'linear-gradient(135deg, #ffd3e8 0%, #bfa8e6 100%)', shadow: 'rgba(191, 168, 230, 0.22)', border: 'rgba(255, 211, 232, 0.35)' }, // Lavender
                      { bg: 'linear-gradient(135deg, #d2f1eb 0%, #87cbd0 100%)', shadow: 'rgba(135, 203, 208, 0.22)', border: 'rgba(210, 241, 235, 0.35)' }, // Mint-Green
                      { bg: 'linear-gradient(135deg, #e0f2fe 0%, #9bc5fb 100%)', shadow: 'rgba(155, 197, 251, 0.22)', border: 'rgba(224, 242, 254, 0.35)' }, // Ice-Blue
                      { bg: 'linear-gradient(135deg, #ffdcd0 0%, #fca49b 100%)', shadow: 'rgba(252, 164, 155, 0.22)', border: 'rgba(255, 220, 208, 0.35)' }, // Dusty Peach
                      { bg: 'linear-gradient(135deg, #f5f5f5 0%, #c4cbd0 100%)', shadow: 'rgba(196, 203, 208, 0.22)', border: 'rgba(245, 245, 245, 0.35)' }  // Champagne-Grey
                    ];

                    // Stable hash helper to choose a random color
                    const getStableIndex = (str: string) => {
                      let hash = 0;
                      for (let i = 0; i < str.length; i++) {
                        hash = str.charCodeAt(i) + ((hash << 5) - hash);
                      }
                      return Math.abs(hash);
                    };

                    // Let's determine a stable randomized color
                    let colorIndex = getStableIndex(persona.id || persona.name) % gradients.length;

                    // If it's the first card in the deck, ALWAYS showcase the gorgeous Lavender Pink!
                    if (index === 0) {
                      colorIndex = 0;
                    } else if (colorIndex === lastColorIndex) {
                      // Prevent adjacent elements from ever sharing the same color
                      colorIndex = (colorIndex + 1) % gradients.length;
                    }

                    lastColorIndex = colorIndex;
                    const gradient = gradients[colorIndex];

                    return (
                      <div key={persona.id} className={`persona-admin-card ${isActive ? 'active' : ''}`}>
                        {/* Top Header section */}
                        <div className="persona-card-header">
                          <div 
                            className="persona-admin-avatar"
                            style={{ background: gradient.bg, boxShadow: `0 4px 14px ${gradient.shadow}` }}
                          >
                            <div className="avatar-glow" style={{ borderColor: gradient.border }}></div>
                            <span className="avatar-initials">{initials}</span>
                          </div>
                          <div className="persona-card-info">
                            <h3>{persona.name}</h3>
                            <span className={`status-pill ${isActive ? 'active' : 'idle'}`}>
                              {isActive ? 'Active Selected' : 'Standby'}
                            </span>
                          </div>
                        </div>

                        {/* Symmetrical Footer action group */}
                        <div className="persona-card-actions">
                          <button 
                            className={`btn-studio-toggle ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              setPreviewingPersona(persona);
                              setPreviewAudioUrl(`http://localhost:8000/api/personas/${persona.id}/preview`);
                            }}
                          >
                            {isActive ? 'Selected' : 'Use in Studio'}
                          </button>
                          <div className="secondary-actions-group">
                            <button 
                              className="btn-studio-icon"
                              onClick={() => {
                                setEditingPersona(persona);
                                setPersonaSpeed(persona.speed || 1.0);
                                setPersonaPitch(persona.pitch || 1.0);
                                setPersonaModel(persona.voiceModel || 'CosyVoice-300M');
                              }}
                              title="Configure Settings"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                              </svg>
                            </button>
                            <button 
                              className="btn-studio-icon danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPersonas(prev => prev.filter(p => p.id !== persona.id));
                              }}
                              title="Delete Persona"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Premium Preview Card Overlay Modal */}
            {previewingPersona && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(6, 12, 11, 0.4)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}>
                <div style={{
                  background: 'white',
                  width: '100%',
                  maxWidth: '440px',
                  borderRadius: '24px',
                  padding: '28px',
                  boxShadow: '0 20px 40px rgba(18, 60, 52, 0.12)',
                  border: '1px solid var(--border-color)',
                  position: 'relative'
                }}>
                  {/* Close button */}
                  <button 
                    onClick={() => {
                      setPreviewingPersona(null);
                      setPreviewAudioUrl('');
                    }}
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: 'rgba(15,28,26,0.04)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-dark)',
                      fontWeight: 'bold'
                    }}
                  >
                    ✕
                  </button>

                  <h3 style={{
                    fontFamily: 'var(--font-title)',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--text-dark)',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    Voice Preview: {previewingPersona.name}
                  </h3>

                  {/* Audio player card */}
                  <div style={{
                    background: 'var(--accent-light)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '24px'
                  }}>
                    <button
                      onClick={togglePreviewPlayback}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'var(--accent-dark)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {isPreviewPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
                    </button>
                    <div>
                      <span style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', display: 'block' }}>
                        Reference Audio Sample
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Play to hear the original vocal recording
                      </span>
                    </div>
                  </div>

                  {/* Use This Voice Confirm Button */}
                  <button
                    onClick={() => {
                      if (previewingPersona) {
                        setActivePersonaId(previewingPersona.id);
                        setVoiceFile(null);
                        setVoiceFileName('');
                        setPreviewingPersona(null);
                        setPreviewAudioUrl('');
                        setActiveTab('voice-studio');
                        setCurrentStep(3);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'var(--accent-dark)',
                      color: 'white',
                      border: 'none',
                      fontFamily: 'var(--font-title)',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(18,60,52,0.15)',
                    }}
                  >
                    Use This Voice
                  </button>
                </div>
              </div>
            )}

            {/* Premium Persona Settings Modal Overlay */}
            {editingPersona && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(6, 12, 11, 0.4)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}>
                <div style={{
                  background: 'white',
                  width: '100%',
                  maxWidth: '460px',
                  borderRadius: '24px',
                  padding: '28px',
                  boxShadow: '0 20px 40px rgba(18, 60, 52, 0.12)',
                  border: '1px solid var(--border-color)',
                  position: 'relative'
                }}>
                  {/* Close button */}
                  <button 
                    onClick={() => setEditingPersona(null)}
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: 'rgba(15,28,26,0.04)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-dark)',
                      fontWeight: 'bold'
                    }}
                  >
                    ✕
                  </button>

                  <h3 style={{
                    fontFamily: 'var(--font-title)',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--text-dark)',
                    marginBottom: '6px',
                    textAlign: 'center'
                  }}>
                    Voice Settings: {editingPersona.name}
                  </h3>
                  <p style={{
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    marginBottom: '24px'
                  }}>
                    Customize backend model behavior and override voice parameters.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
                    {/* Model override */}
                    <div>
                      <label style={{ display: 'block', fontFamily: 'var(--font-title)', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '8px' }}>
                        AI Cloning Model
                      </label>
                      <select
                        value={personaModel}
                        onChange={(e) => setPersonaModel(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          background: 'white',
                          color: 'var(--text-dark)',
                          fontFamily: 'inherit',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="CosyVoice-300M">🎙️ CosyVoice 300M (Zero-shot / High-Fidelity)</option>
                        <option value="CosyVoice-2">✨ CosyVoice v2 (Enhanced Expressiveness)</option>
                        <option value="GPT-SoVITS">💎 GPT-SoVITS (Precise Pitch Matching)</option>
                      </select>
                    </div>

                    {/* Speed Slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-title)', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>Speaking Speed</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-dark)' }}>{personaSpeed}x</span>
                      </div>
                      <input 
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={personaSpeed}
                        onChange={(e) => setPersonaSpeed(parseFloat(e.target.value))}
                        style={{
                          width: '100%',
                          accentColor: 'var(--accent-dark)',
                          cursor: 'pointer'
                        }}
                      />
                    </div>

                    {/* Pitch Slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-title)', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>Pitch Adjust</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-dark)' }}>{personaPitch > 1 ? `+${(personaPitch - 1).toFixed(1)}` : (personaPitch - 1).toFixed(1)}</span>
                      </div>
                      <input 
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={personaPitch}
                        onChange={(e) => setPersonaPitch(parseFloat(e.target.value))}
                        style={{
                          width: '100%',
                          accentColor: 'var(--accent-dark)',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  </div>

                  {/* Save changes action */}
                  <button
                    onClick={() => {
                      // Update persona attributes in our state
                      setPersonas(prev => prev.map(p => {
                        if (p.id === editingPersona.id) {
                          return {
                            ...p,
                            voiceModel: personaModel,
                            speed: personaSpeed,
                            pitch: personaPitch
                          };
                        }
                        return p;
                      }));
                      setEditingPersona(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'var(--accent-dark)',
                      color: 'white',
                      border: 'none',
                      fontFamily: 'var(--font-title)',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(18,60,52,0.15)',
                    }}
                  >
                    Save Voice Parameters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
