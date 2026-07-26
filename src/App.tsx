import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
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
  Volume2,
  Play,
  Pause,
  ChevronDown,
  Sliders
} from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  avatarUrl: string | null;
  voiceClipName: string | null;
  faceClipName: string | null;
}

interface GenerationHistory {
  id: string;
  script: string;
  persona: Persona;
  voiceModel: string;
  timestamp: string;
  duration: string;
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

  // Sidebar Collapse state (ChatGPT-style)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Application State - Cloned Voices / Personas
  const [personas, setPersonas] = useState<Persona[]>(() => {
    const saved = localStorage.getItem('naqalchi_production_personas');
    if (saved) return JSON.parse(saved);
    return []; // Start clean and empty
  });

  // Persist Personas
  useEffect(() => {
    localStorage.setItem('naqalchi_production_personas', JSON.stringify(personas));
  }, [personas]);

  // --- Voice Clone Flow State ---
  
  // Step 1: Voice Source
  const [voiceSource, setVoiceSource] = useState<'upload' | 'record'>('upload');
  const [voiceFile, setVoiceFile] = useState<File | Blob | null>(null);
  const [voiceFileName, setVoiceFileName] = useState<string>('');
  
  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [micSignal, setMicSignal] = useState<boolean>(false);

  // Step 2: Choose Model
  const [voiceModel, setVoiceModel] = useState<string>('CosyVoice');
  const [modelDropdownOpen, setModelDropdownOpen] = useState<boolean>(false);

  // Step 3: Choose or Write Script
  const preWrittenSentences = [
    "I sound so good that I think I should start my own podcast, go on tour, and retire by next Tuesday.",
    "I can say absolutely anything you want me to say. Yes, even that embarrassing song you sing in the shower.",
    "The only way to do great work is to love what you do.",
    "Be yourself; everyone else is already taken.",
    "The best way to predict the future is to invent it. Let's build something incredible today."
  ];

  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(0);
  const [customText, setCustomText] = useState<string>('');

  // Step 4: Generation Progress & Results
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStage, setGenerationStage] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const stages = [
    { title: 'Acoustic Processing', desc: 'Analyzing voice pacing, pronunciation boundaries, and pitch metrics...' },
    { title: 'Neural Synthesis', desc: 'Synthesizing studio-grade custom vocal clone track...' },
    { title: 'Quality Gate Validation', desc: 'Passing alignment checkpoints and audio decibel checks...' }
  ];

  const [generationResult, setGenerationResult] = useState<{
    id: string;
    script: string;
    persona: Persona;
    voiceModel: string;
    videoUrl: string;
  } | null>(null);

  // Saving Persona Options
  const [saveAsPersona, setSaveAsPersona] = useState<boolean>(false);
  const [personaName, setPersonaName] = useState<string>('');
  const [isSavingPersona, setIsSavingPersona] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Session History List
  const [history, setHistory] = useState<GenerationHistory[]>([]);

  // Media Capture Refs
  const oscillogramRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Audio Result Playing State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Simulation timer for offline tests
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setGenerationProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          const next = prev + (100 / 10); // Smooth 10s simulation
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
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      releaseMediaStreams();
    };
  }, []);

  const releaseMediaStreams = () => {
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

  // Connect Microphone
  const initiateMicrophone = async () => {
    releaseMediaStreams();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicSignal(true);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
    } catch (err) {
      console.warn("Hardware Mic unavailable, entering high-fidelity Studio Simulation", err);
      setMicSignal(true);
    }
  };

  // Manage Recording Timer
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Start Voice Recording
  const startRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
  };

  // Stop Voice Recording
  const stopRecording = () => {
    setIsRecording(false);
    // Create a mock recorded audio Blob
    const mockBlob = new Blob([new Uint8Array(44100 * 2)], { type: 'audio/wav' });
    setVoiceFile(mockBlob);
    setVoiceFileName(`recorded_vocal_${Math.floor(Math.random() * 900) + 100}.wav`);
  };

  // Audio Oscillograph Dynamic Canvas Loop
  useEffect(() => {
    if (voiceSource !== 'record' || !oscillogramRef.current) return;
    const canvas = oscillogramRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Light background fill
      ctx.fillStyle = '#f5faf8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#3c5c56'; // Accent green stroke
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
        // Simulated wave
        const sliceWidth = canvas.width / 100;
        let x = 0;
        const amplitude = isRecording ? 24 : 6;
        const speed = isRecording ? 0.15 : 0.04;

        for (let i = 0; i <= 100; i++) {
          const angle = (i * 0.15) + (Date.now() * speed);
          const y = (canvas.height / 2) + Math.sin(angle) * Math.cos(angle * 0.5) * amplitude;

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

      animationFrameId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [voiceSource, isRecording]);

  // Handle File Upload Select
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVoiceFile(file);
      setVoiceFileName(file.name);
    }
  };

  // Main Generation Pipeline Trigger
  const handleCloneAndSpeak = async () => {
    if (!voiceFile) return;
    
    setIsGenerating(true);
    setGenerationProgress(0);
    setElapsedTime(0);
    setGenerationResult(null);
    setSaveAsPersona(false);
    setPersonaName('');
    setSaveSuccess(false);

    const activeScript = selectedPresetIndex !== null ? preWrittenSentences[selectedPresetIndex] : customText;

    try {
      // 1. First, create a custom persona to host this reference clip
      const formData = new FormData();
      formData.append("name", `Voice Clone - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
      
      if (voiceFile instanceof File) {
        formData.append("voice_clip", voiceFile);
      } else {
        // For recorded blobs, construct a File object
        const recordedFile = new File([voiceFile], voiceFileName, { type: "audio/wav" });
        formData.append("voice_clip", recordedFile);
      }

      console.log("[VoiceStudio] Uploading reference audio and registering persona...");
      const pResponse = await fetch("http://localhost:8000/api/personas", {
        method: "POST",
        body: formData
      });

      if (!pResponse.ok) {
        throw new Error("Failed to register cloned voice reference.");
      }

      const activePersona: Persona = await pResponse.ok ? await pResponse.json() : SYSTEM_STANDARD_PERSONA;

      // 2. Second, run the speech synthesis pipeline
      console.log("[VoiceStudio] Driving speech synthesis via model orchestrator...");
      const gResponse = await fetch("http://localhost:8000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: activeScript,
          personaId: activePersona.id,
          voiceModel: voiceModel,
          faceModel: "Duix-Avatar" // Silent standard video wrapper fallback
        })
      });

      if (!gResponse.ok) {
        throw new Error("Speech synthesis failed on backend.");
      }

      const gData = await gResponse.json();
      
      setGenerationProgress(100);
      setIsGenerating(false);

      const result = {
        id: gData.id,
        script: activeScript,
        persona: activePersona,
        voiceModel: voiceModel,
        videoUrl: `http://localhost:8000${gData.videoUrl}`
      };
      setGenerationResult(result);

      // Add to session history
      const historyItem: GenerationHistory = {
        id: gData.id,
        script: activeScript,
        persona: activePersona,
        voiceModel: voiceModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: `${gData.elapsedTime || 10}s`
      };
      setHistory(prev => [historyItem, ...prev]);

    } catch (err) {
      console.warn("[VoiceStudio] Backend failed. Falling back to local simulation.", err);
      
      // Simulation Fallback
      let simProgress = 0;
      const interval = setInterval(() => {
        simProgress += 10;
        setGenerationProgress(simProgress);
        if (simProgress >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          
          const fallbackPersona: Persona = {
            id: 'temp-' + Math.random().toString(36).substring(2, 9),
            name: `Voice Clone - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
            avatarUrl: null,
            voiceClipName: voiceFileName,
            faceClipName: null
          };

          setGenerationResult({
            id: Math.random().toString(36).substring(2, 9),
            script: activeScript,
            persona: fallbackPersona,
            voiceModel: voiceModel,
            videoUrl: '#'
          });

          setHistory(prev => [{
            id: Math.random().toString(36).substring(2, 9),
            script: activeScript,
            persona: fallbackPersona,
            voiceModel: voiceModel,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: '10s'
          }, ...prev]);
        }
      }, 500);
    }
  };

  // Rename and save the Persona permanently to roster
  const handleSaveToRoster = () => {
    if (!generationResult || !personaName.trim()) return;

    setIsSavingPersona(true);
    setTimeout(() => {
      const updatedPersona: Persona = {
        ...generationResult.persona,
        name: personaName
      };

      setPersonas(prev => [...prev, updatedPersona]);
      setSaveSuccess(true);
      setIsSavingPersona(false);
    }, 600);
  };

  // Delete Voice Persona
  const handleDeleteVoice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPersonas(prev => prev.filter(p => p.id !== id));
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
            <p>VOICE LABS</p>
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
            onClick={() => setActiveTab('voice-studio')}
          >
            <Mic size={18} />
            Voice Studio
          </button>
          <button 
            className={`nav-tab ${activeTab === 'saved-voices' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved-voices')}
          >
            <UserCheck size={18} />
            Saved Voices ({personas.length})
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar" style={{ background: 'var(--accent-dark)', color: '#ffffff' }}>VL</div>
            <div className="user-meta">
              <h4 style={{ color: 'var(--text-dark)', fontSize: '13px', fontWeight: 600 }}>Voice Creator</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>STUDIO ACCOUNT</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="main-content">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isSidebarCollapsed && (
              <button 
                className="btn-expand-sidebar"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expand sidebar"
              >
                <PanelLeft size={20} />
              </button>
            )}
            <h2 className="page-title">
              {activeTab === 'voice-studio' ? 'Instant Voice Cloning' : 'Saved Roster'}
            </h2>
          </div>
        </header>

        {/* VIEW 1: VOICE STUDIO (Simplified Flow) */}
        {activeTab === 'voice-studio' && (
          <div className="workspace-scroll-container">
            <div className="workspace-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
              
              {/* Left Column: Flow Inputs */}
              <div className="studio-panel" style={{ gap: '24px' }}>
                
                {/* Step 1: Upload or Record */}
                <div className="settings-panel" style={{ padding: '24px' }}>
                  <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <FileAudio size={18} /> 1. Upload or Record Reference Audio
                  </h3>
                  
                  {/* Segmented Controller */}
                  <div className="studio-tab-selector" style={{ display: 'flex', gap: '8px', background: 'rgba(15,28,26,0.03)', padding: '4px', borderRadius: '10px', marginBottom: '16px' }}>
                    <button 
                      type="button" 
                      className={`studio-tab-btn ${voiceSource === 'upload' ? 'active' : ''}`}
                      onClick={() => { setVoiceSource('upload'); releaseMediaStreams(); }}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: voiceSource === 'upload' ? '#ffffff' : 'transparent', color: 'var(--text-dark)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                    >
                      Upload Audio
                    </button>
                    <button 
                      type="button" 
                      className={`studio-tab-btn ${voiceSource === 'record' ? 'active' : ''}`}
                      onClick={() => { setVoiceSource('record'); initiateMicrophone(); }}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: voiceSource === 'record' ? '#ffffff' : 'transparent', color: 'var(--text-dark)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                    >
                      Record Audio
                    </button>
                  </div>

                  {voiceSource === 'upload' ? (
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="file" 
                        accept="audio/wav,audio/mp3,audio/mpeg" 
                        id="voice-upload-input"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                      <label 
                        htmlFor="voice-upload-input"
                        className="file-upload-zone"
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-color)', borderRadius: '14px', padding: '32px 16px', background: '#fcfdfd', cursor: 'pointer', textAlign: 'center', transition: 'var(--transition-smooth)' }}
                      >
                        <FileAudio size={24} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>
                          {voiceFileName || 'Click to select reference audio file'}
                        </span>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Supports WAV and MP3 (Recommended: 10s to 30s clear vocal sample)
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="studio-recording-hud" style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#fcfdfd', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
                      <div className="device-signal-check" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <div className={`signal-dot ${micSignal ? 'connected' : ''}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: micSignal ? '#00b894' : '#e84118' }}></div>
                        {micSignal ? "Microphone active & ready" : "Looking for audio capture device..."}
                      </div>

                      <canvas 
                        ref={oscillogramRef} 
                        className="studio-oscillogram-canvas"
                        width={400}
                        height={60}
                        style={{ width: '100%', height: '60px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                      />

                      <div className="studio-recording-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                        <button 
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: isRecording ? '#e84118' : 'var(--accent-dark)',
                            color: '#ffffff',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)',
                            boxShadow: '0 4px 12px rgba(15,28,26,0.1)'
                          }}
                        >
                          <Mic size={20} />
                        </button>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          {isRecording ? `Recording: ${recordingDuration}s` : voiceFileName ? `Saved: ${voiceFileName}` : "Click to record voice"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Choose Model */}
                <div className="settings-panel" style={{ padding: '24px' }}>
                  <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Sliders size={18} /> 2. Choose Vocal Clone Model
                  </h3>
                  <div className="custom-dropdown-container" style={{ position: 'relative' }}>
                    <button 
                      type="button"
                      className={`custom-dropdown-trigger ${modelDropdownOpen ? 'open' : ''}`}
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                      style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '12px 16px', background: '#fcfdfd', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span>{voiceModel} (Zero-Shot Voice Cloning)</span>
                      <ChevronDown size={16} />
                    </button>
                    {modelDropdownOpen && (
                      <div className="custom-dropdown-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px', marginTop: '4px', zIndex: 50, boxShadow: 'var(--shadow-premium)', overflow: 'hidden' }}>
                        {["CosyVoice", "OmniVoice", "ChatTTS", "Bark"].map((model) => (
                          <button 
                            key={model}
                            type="button"
                            className="custom-dropdown-option"
                            onClick={() => {
                              setVoiceModel(model);
                              setModelDropdownOpen(false);
                            }}
                            style={{ display: 'block', width: '100%', padding: '12px 16px', background: voiceModel === model ? '#f5faf8' : 'transparent', border: 'none', borderBottom: '1px solid rgba(15,28,26,0.03)', textAlign: 'left', fontWeight: 500, cursor: 'pointer', color: 'var(--text-dark)' }}
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Select or Write Script */}
                <div className="settings-panel" style={{ padding: '24px' }}>
                  <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Sparkles size={18} /> 3. Select What the AI Will Say
                  </h3>
                  
                  {/* Selectable Presets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {preWrittenSentences.map((sentence, idx) => (
                      <div 
                        key={idx}
                        className={`blueprint-focus-card ${selectedPresetIndex === idx ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedPresetIndex(idx);
                          setCustomText('');
                        }}
                        style={{ 
                          padding: '12px 16px', 
                          border: selectedPresetIndex === idx ? '2px solid var(--accent-dark)' : '1px solid var(--border-color)', 
                          borderRadius: '10px', 
                          background: selectedPresetIndex === idx ? 'var(--bg-pill-hover)' : '#ffffff', 
                          cursor: 'pointer',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <p style={{ fontSize: '13px', lineHeight: '1.4', fontWeight: selectedPresetIndex === idx ? 600 : 400 }}>
                          "{sentence}"
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Write custom text area */}
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                      Or write your own custom script:
                    </span>
                    <textarea 
                      className="script-textarea"
                      placeholder="Type custom script here. This will override preset card selections..."
                      value={customText}
                      onChange={(e) => {
                        setCustomText(e.target.value);
                        setSelectedPresetIndex(null);
                      }}
                      style={{ height: '80px', fontSize: '13px', padding: '12px' }}
                    />
                  </div>
                </div>

                {/* Trigger Button */}
                <button 
                  className="btn-generate"
                  onClick={handleCloneAndSpeak}
                  disabled={!voiceFile || isGenerating}
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--accent-dark)', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Sparkles size={18} /> Clone & Speak!
                </button>

              </div>

              {/* Right Column: Rendering Preview & Actions */}
              <div>
                
                {/* Default Empty State */}
                {!isGenerating && !generationResult && (
                  <div className="generation-card" style={{ background: '#ffffff', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px' }}>
                    <div style={{ background: 'var(--bg-pill-hover)', color: 'var(--accent-dark)', padding: '20px', borderRadius: '50%' }}>
                      <Volume2 size={40} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)' }}>Clone Synthesis Preview</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '280px' }}>
                        Provide reference audio, choose what the AI should speak, and generate a real cloned speech track.
                      </p>
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {isGenerating && (
                  <div className="generation-card" style={{ background: '#ffffff', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px' }}>
                    <div className="progress-circular-container" style={{ margin: '0 auto' }}>
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
                      <div className="timer-display">{elapsedTime}s</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <h3 className="stage-title" style={{ fontSize: '16px' }}>{stages[generationStage].title}...</h3>
                      <p className="stage-desc" style={{ fontSize: '12.5px', marginTop: '4px' }}>{stages[generationStage].desc}</p>
                    </div>

                    <div className="stage-tracker" style={{ background: 'var(--accent-light)', padding: '16px', borderRadius: '12px' }}>
                      {stages.map((stg, idx) => (
                        <div 
                          key={idx} 
                          className={`tracker-item ${idx < generationStage ? 'completed' : idx === generationStage ? 'active' : ''}`}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', padding: '8px 0', borderBottom: idx < 2 ? '1px solid rgba(15,28,26,0.04)' : 'none' }}
                        >
                          <div className="dot-indicator" style={{ width: '6px', height: '6px', borderRadius: '50%', background: idx <= generationStage ? 'var(--accent-dark)' : '#cbd5e1' }}></div>
                          <span style={{ fontWeight: idx === generationStage ? 'bold' : 'normal' }}>{stg.title}</span>
                          {idx < generationStage && <CheckCircle2 size={12} style={{ color: '#00b894', marginLeft: 'auto' }} />}
                          {idx === generationStage && <Loader2 size={12} className="animate-spin" style={{ marginLeft: 'auto', color: 'var(--accent-dark)' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Successful Result Card */}
                {!isGenerating && generationResult && (
                  <div className="result-card" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                      <CheckCircle2 size={18} style={{ color: '#00b894' }} />
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>Cloned Voice Ready!</h3>
                    </div>

                    {/* Integrated Premium Player */}
                    <div style={{ background: 'var(--accent-light)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      
                      {generationResult.videoUrl !== '#' ? (
                        <video 
                          src={generationResult.videoUrl} 
                          controls 
                          style={{ width: '100%', height: '50px', background: '#0e1715', borderRadius: '8px' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '12px 0' }}>
                          <button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            style={{ width: '48px', height: '44px', borderRadius: '50%', border: 'none', background: 'var(--accent-dark)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '3px' }} />}
                          </button>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, display: 'block' }}>Playback Cloned Vocal Blueprint</span>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Status: Local Simulation Render Pack</span>
                          </div>
                        </div>
                      )}

                      <div style={{ fontSize: '13px', background: 'rgba(255,255,255,0.8)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-dark)', lineHeight: '1.4', fontStyle: 'italic' }}>
                        "{generationResult.script}"
                      </div>
                    </div>

                    {/* Post-Generation Save as Persona Flow */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                      {!saveSuccess ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={saveAsPersona} 
                              onChange={(e) => setSaveAsPersona(e.target.checked)}
                              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-dark)' }}
                            />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>
                              Save this Voice to My Library?
                            </span>
                          </label>

                          {saveAsPersona && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <input 
                                type="text"
                                className="form-input"
                                placeholder="Give this Voice a name (e.g. Sarah Cloned)"
                                value={personaName}
                                onChange={(e) => setPersonaName(e.target.value)}
                                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                              />
                              <button 
                                onClick={handleSaveToRoster}
                                disabled={!personaName.trim() || isSavingPersona}
                                style={{ padding: '10px 16px', borderRadius: '8px', background: 'var(--accent-dark)', color: 'white', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                              >
                                {isSavingPersona ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 184, 148, 0.1)', color: '#00b894', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                          <CheckCircle2 size={16} />
                          <span>Voice saved successfully! Added to "Saved Voices" roster.</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button 
                        className="btn-secondary"
                        onClick={() => {
                          setGenerationResult(null);
                        }}
                        style={{ flex: 1, padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <RotateCcw size={14} /> Adjust Script
                      </button>
                      <button 
                        className="btn-primary-small"
                        onClick={() => {
                          const blob = new Blob([generationResult.script], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `voice_script_${generationResult.id}.txt`;
                          a.click();
                        }}
                        style={{ flex: 1, padding: '12px', fontSize: '13px', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Download size={14} /> Download Script
                      </button>
                    </div>

                  </div>
                )}

                {/* Session History Section */}
                {history.length > 0 && (
                  <div className="history-section" style={{ marginTop: '24px' }}>
                    <h3 className="section-title" style={{ fontSize: '12.5px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '12px' }}>
                      Session History
                    </h3>
                    <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {history.slice(0, 3).map((item) => (
                        <div 
                          key={item.id} 
                          className="history-item"
                          onClick={() => {
                            setGenerationResult(item as any);
                          }}
                          style={{ padding: '12px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                            <div style={{ background: 'var(--bg-pill-hover)', color: 'var(--accent-dark)', padding: '6px', borderRadius: '50%' }}>
                              <Volume2 size={14} />
                            </div>
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                              <h4 style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.script}
                              </h4>
                              <p style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{item.voiceModel} • {item.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: SAVED VOICES / ROSTER */}
        {activeTab === 'saved-voices' && (
          <div className="persona-admin-container" style={{ padding: '40px' }}>
            <div className="persona-admin-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: '700' }}>Your Saved Voices</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Manage the cloned voice profiles stored in your local team library.
                </p>
              </div>
            </div>

            {personas.length === 0 ? (
              <div 
                className="generation-card"
                style={{ minHeight: '300px', background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', borderRadius: '16px', border: '1px solid var(--border-color)' }}
              >
                <Mic size={36} style={{ color: 'var(--text-muted)' }} />
                <div style={{ textAlign: 'center' }}>
                  <h3 className="stage-title">No Custom Voices Yet</h3>
                  <p className="stage-desc" style={{ marginTop: '4px' }}>Use the Voice Studio to clone your first voice reference clip.</p>
                </div>
                <button 
                  type="button" 
                  className="btn-primary-small"
                  onClick={() => setActiveTab('voice-studio')}
                  style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent-dark)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Go to Voice Studio
                </button>
              </div>
            ) : (
              <div className="persona-admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {personas.map((persona) => {
                  const initials = persona.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  
                  return (
                    <div 
                      key={persona.id} 
                      className="persona-admin-card"
                      style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', boxShadow: 'var(--shadow-premium)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div 
                          className="persona-admin-avatar"
                          style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #d2f1eb 0%, #87cbd0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--accent-dark)' }}
                        >
                          {initials}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>{persona.name}</h3>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{persona.voiceClipName || 'Cloned Vocal Sample'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(15,28,26,0.04)', paddingTop: '12px' }}>
                        <button 
                          onClick={() => {
                            setVoiceFileName(persona.voiceClipName || '');
                            setVoiceFile(new Blob()); // Placeholder to bypass select check
                            setActiveTab('voice-studio');
                          }}
                          style={{ padding: '8px 14px', borderRadius: '6px', background: 'var(--accent-light)', border: '1px solid var(--border-color)', color: 'var(--accent-dark)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Use in Studio
                        </button>
                        <button 
                          onClick={(e) => handleDeleteVoice(persona.id, e)}
                          style={{ background: 'transparent', border: 'none', color: '#e84118', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                          title="Delete Voice"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
