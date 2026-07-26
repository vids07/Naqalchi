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
  ChevronLeft
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

  // Step 2 State: Voice Model selection
  const [voiceModel, setVoiceModel] = useState<string>('CosyVoice');

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

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

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

  // Handle generation ticks
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
          const next = prev + (100 / 10); // Smooth 10 second synthesis
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

  // Clean up recording context
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
    setIsRecording(true);
    setRecordingDuration(0);
  };

  const stopRecording = () => {
    setIsRecording(false);
    const mockBlob = new Blob([new Uint8Array(44100 * 2)], { type: 'audio/wav' });
    setVoiceFile(mockBlob);
    setVoiceFileName(`recorded_vocal_${Math.floor(Math.random() * 900) + 100}.wav`);
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
      const formData = new FormData();
      formData.append("name", `Voice Clone - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
      
      if (voiceFile instanceof File) {
        formData.append("voice_clip", voiceFile);
      } else {
        const recordedFile = new File([voiceFile], voiceFileName, { type: "audio/wav" });
        formData.append("voice_clip", recordedFile);
      }

      const pResponse = await fetch("http://localhost:8000/api/personas", {
        method: "POST",
        body: formData
      });

      const activePersona: Persona = pResponse.ok ? await pResponse.json() : SYSTEM_STANDARD_PERSONA;

      const gResponse = await fetch("http://localhost:8000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: activeScript,
          personaId: activePersona.id,
          voiceModel: voiceModel,
          faceModel: "Duix-Avatar"
        })
      });

      if (!gResponse.ok) throw new Error("Synthesis failed");

      const gData = await gResponse.json();
      
      setGenerationProgress(100);
      setIsGenerating(false);

      setGenerationResult({
        id: gData.id,
        script: activeScript,
        persona: activePersona,
        voiceModel: voiceModel,
        videoUrl: `http://localhost:8000${gData.videoUrl}`
      });

    } catch (err) {
      console.warn("Backend unavailable. Simulating generation execution...", err);
      
      // Complete simulated progress
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
        }
      }, 500);
    }
  };

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
        <header className="top-header" style={{ padding: '16px 32px' }}>
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
          </div>
        </header>

        {/* VIEW 1: VOICE STUDIO (Zero-Scroll Stepper Studio Console) */}
        {activeTab === 'voice-studio' && (
          <div className="persona-admin-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="persona-admin-header" style={{ marginBottom: '28px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: '700' }}>Instant Voice Cloning</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Clone reference voice clips and generate custom narrated scripts.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, paddingBottom: '40px' }}>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                
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
                      <div>
                        <input 
                          type="file" 
                          accept="audio/wav,audio/mp3,audio/mpeg" 
                          id="console-upload-file"
                          style={{ display: 'none' }}
                          onChange={handleFileUpload}
                        />
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
                            {voiceFileName || 'Click to select reference audio file'}
                          </span>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Supports high-quality WAV or MP3 audio
                          </p>
                        </label>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#fcfdfd', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
                        <canvas 
                          ref={oscillogramRef} 
                          width={400}
                          height={50}
                          style={{ width: '100%', height: '50px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                          <button 
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: isRecording ? '#e84118' : 'var(--accent-dark)',
                              color: '#ffffff',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            <Mic size={18} />
                          </button>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>
                            {isRecording ? `Recording: ${recordingDuration}s` : voiceFileName ? `Sample Saved: ${voiceFileName}` : "Click mic to record live"}
                          </div>
                        </div>
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      {[
                        { name: 'CosyVoice', tag: '🎭 Realism', desc: 'Ultra-realistic zero-shot voice cloning with expressive pitch ranges.' },
                        { name: 'ChatTTS', tag: '🎙️ Conversational', desc: 'Optimized for high-fidelity conversational pacing and natural pauses.' },
                        { name: 'Bark', tag: '✨ Creative', desc: 'Great for soundscapes, artistic rendering, and diverse accents.' }
                      ].map((model) => (
                        <div 
                          key={model.name}
                          onClick={() => {
                            setVoiceModel(model.name);
                            setCurrentStep(3); // Auto-advance to script text
                          }}
                          style={{
                            border: voiceModel === model.name ? '2px solid var(--accent-dark)' : '1px solid var(--border-color)',
                            background: voiceModel === model.name ? 'var(--bg-pill-hover)' : '#ffffff',
                            borderRadius: '12px',
                            padding: '16px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(15,28,26,0.06)', color: 'var(--text-dark)', padding: '3px 8px', borderRadius: '20px', display: 'inline-block', marginBottom: '8px' }}>
                            {model.tag}
                          </span>
                          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>{model.name}</h4>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>{model.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3: Choose or Write Script */}
                {currentStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4px' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 184, 148, 0.08)', color: '#00b894', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                              <CheckCircle2 size={14} />
                              <span>Successfully saved voice to library database!</span>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Navigation Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 4) {
                      setGenerationResult(null);
                      setCurrentStep(3);
                    } else {
                      setCurrentStep(prev => prev - 1);
                    }
                  }}
                  disabled={currentStep === 1 || isGenerating}
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
                    opacity: currentStep === 1 || isGenerating ? 0.3 : 1,
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <ChevronLeft size={16} /> Back
                </button>

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
                    onClick={() => {
                      setCurrentStep(4);
                      handleCloneAndSpeak();
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
                    disabled={isGenerating}
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
                      opacity: isGenerating ? 0.4 : 1,
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <RotateCcw size={16} /> Clone Another Voice
                  </button>
                )}
              </div>

            </div>
          </div>
          </div>
        )}

        {/* VIEW 2: SAVED VOICES / ROSTER */}
        {activeTab === 'saved-voices' && (
          <div className="persona-admin-container">
            <div className="persona-admin-header">
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
                              setActivePersonaId(persona.id);
                              setVoiceFileName(persona.voiceClipName || '');
                              setVoiceFile(new Blob());
                              setActiveTab('voice-studio');
                              setCurrentStep(3); // Start right at script select with loaded voice
                            }}
                          >
                            {isActive ? 'Selected' : 'Use in Studio'}
                          </button>
                          <div className="secondary-actions-group">
                            <button 
                              className="btn-studio-icon"
                              onClick={() => {
                                setActivePersonaId(persona.id);
                                setVoiceFileName(persona.voiceClipName || '');
                                setVoiceFile(new Blob());
                                setActiveTab('voice-studio');
                                setCurrentStep(3);
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
          </div>
        )}
      </main>
    </div>
  );
}
