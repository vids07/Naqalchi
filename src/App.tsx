import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  RotateCcw, 
  Trash2, 
  UserPlus, 
  Settings2, 
  Sliders, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Sparkles,
  UserCheck,
  FileAudio,
  FileVideo,
  PanelLeft,
  PanelLeftClose,
  Mic,
  Video,
  Camera
} from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  avatarUrl: string | null;
  voiceClipName: string | null;
  faceClipName: string | null;
  focus?: 'corporate' | 'social';
}

interface GenerationHistory {
  id: string;
  script: string;
  persona: Persona;
  voiceModel: string;
  faceModel: string;
  timestamp: string;
  duration: string;
}

const SYSTEM_STANDARD_PERSONA: Persona = {
  id: 'system-standard',
  name: 'Standard Presenter',
  avatarUrl: null,
  voiceClipName: 'standard_vocal_model.wav',
  faceClipName: 'standard_mesh_model.mp4',
  focus: 'corporate'
};

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'generate' | 'personas'>('generate');

  // Sidebar Collapse state (ChatGPT-style)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Application State - Personas (Starts empty by default as requested)
  const [personas, setPersonas] = useState<Persona[]>(() => {
    const saved = localStorage.getItem('naqalchi_production_personas');
    if (saved) return JSON.parse(saved);
    return []; // Empty by default
  });

  // Persist Personas
  useEffect(() => {
    localStorage.setItem('naqalchi_production_personas', JSON.stringify(personas));
  }, [personas]);

  // Main Generator State
  const [script, setScript] = useState<string>(
    "Welcome to Naqalchi. This is a production-ready system designed to generate polished, branded social media content. Type your script, create your custom speaking personas with vocal samples, select your desired studio settings, and generate professional speaking video assets instantly."
  );
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(SYSTEM_STANDARD_PERSONA);

  // Synchronize selection if personas list changes
  useEffect(() => {
    if (!selectedPersona) {
      setSelectedPersona(SYSTEM_STANDARD_PERSONA);
    }
  }, [personas, selectedPersona]);

  // Consumer-Friendly Model Labels (Cleaned as requested)
  const [voiceModel, setVoiceModel] = useState<string>('Standard Voice');
  const [faceModel, setFaceModel] = useState<string>('Standard Avatar');

  // Generation Pipeline Progress State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStage, setGenerationStage] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  
  // Clean end-user-facing progress descriptive stages
  const stages = [
    { title: 'Script Optimization', desc: 'Analyzing voice pacing, pronunciation boundaries, and natural pausing...' },
    { title: 'Voice Generation', desc: 'Synthesizing studio-grade custom vocal clone track...' },
    { title: 'Visual Synthesis', desc: 'Matching lipsync movement coordinates with high-fidelity keypoints...' },
    { title: 'High-Definition Compositing', desc: 'Rendering final high-definition video frames and audio channels...' }
  ];

  // Output/Result screen state
  const [generationResult, setGenerationResult] = useState<{
    script: string;
    persona: Persona;
    voiceModel: string;
    faceModel: string;
    videoUrl: string;
  } | null>(null);

  // Session History List
  const [history, setHistory] = useState<GenerationHistory[]>([]);

  // New Persona Modal Form States
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newPersonaName, setNewPersonaName] = useState<string>('');
  const [newPersonaVoiceFile, setNewPersonaVoiceFile] = useState<string | null>(null);
  const [newPersonaFaceFile, setNewPersonaFaceFile] = useState<string | null>(null);

  // Upgraded Premium Wizard State Systems
  const [wizardStep, setWizardStep] = useState<number>(0); // 0: Name, 1: Voice, 2: Face, 3: Diagnostics
  const [voiceSource, setVoiceSource] = useState<'upload' | 'record'>('upload');
  const [faceSource, setFaceSource] = useState<'upload' | 'record'>('upload');
  const [personaFocus, setPersonaFocus] = useState<'corporate' | 'social'>('corporate');
  
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [voiceTimer, setVoiceTimer] = useState<number>(0);
  const [micSignal, setMicSignal] = useState<boolean>(false);
  
  const [isRecordingFace, setIsRecordingFace] = useState<boolean>(false);
  const [faceTimer, setFaceTimer] = useState<number>(0);
  const [faceCountdown, setFaceCountdown] = useState<number>(0);
  const [cameraSignal, setCameraSignal] = useState<boolean>(false);

  const [diagnosticProgress, setDiagnosticProgress] = useState<number>(0);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);

  // Refs for media capturing and visual telemetry
  const oscillogramRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Refs & Hooks for Playing Speaking Canvas
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Timer loop for simulation
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
          const next = prev + (100 / 12); // Smooth 12-second generation simulation
          
          if (next < 25) setGenerationStage(0);
          else if (next < 55) setGenerationStage(1);
          else if (next < 80) setGenerationStage(2);
          else setGenerationStage(3);

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

  // Handle Synthesis End
  useEffect(() => {
    if (generationProgress >= 100 && isGenerating && selectedPersona) {
      setIsGenerating(false);
      const resultObj = {
        script: script,
        persona: selectedPersona,
        voiceModel: voiceModel,
        faceModel: faceModel,
        videoUrl: '#'
      };
      setGenerationResult(resultObj);
      
      // Add to session history
      const newHistoryItem: GenerationHistory = {
        id: Math.random().toString(36).substr(2, 9),
        script: script,
        persona: selectedPersona,
        voiceModel: voiceModel,
        faceModel: faceModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: `${elapsedTime}s`
      };
      setHistory(prev => [newHistoryItem, ...prev]);
    }
  }, [generationProgress, isGenerating, selectedPersona]);

  // Speaking Simulation Canvas Rendering Engine
  useEffect(() => {
    if (!generationResult || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let captionIndex = 0;
    const scriptWords = generationResult.script.split(' ');
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render modern high-end studio background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#162a26'); // Elegant deep-forest green/charcoal
      gradient.addColorStop(1, '#0b1210');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Drawing stylized presenter ring
      ctx.strokeStyle = 'rgba(191, 229, 223, 0.15)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 15, 80, 0, Math.PI * 2);
      ctx.stroke();

      // Stylized premium avatar card
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 15, 74, 0, Math.PI * 2);
      ctx.fill();

      // Persona Initials
      ctx.font = "bold 44px 'Outfit'";
      ctx.fillStyle = '#bfe5df'; // Accent mint
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const initials = generationResult.persona.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      ctx.fillText(initials, canvas.width / 2, canvas.height / 2 - 15);

      // Presenter Name label
      ctx.font = "600 13px 'Inter'";
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(generationResult.persona.name.toUpperCase(), canvas.width / 2, canvas.height / 2 + 85);

      // Live voice waveform when playing
      if (isPlaying) {
        ctx.fillStyle = '#bfe5df'; // Soft mint theme waveform
        const numBars = 40;
        const spacing = 6;
        const startX = (canvas.width - (numBars * spacing)) / 2;
        
        for (let i = 0; i < numBars; i++) {
          const barHeight = Math.sin(Date.now() * 0.009 + i * 0.4) * Math.cos(Date.now() * 0.004 + i * 0.1) * 35 + 8;
          const x = startX + (i * spacing);
          const y = canvas.height - 35;
          ctx.fillRect(x, y - Math.abs(barHeight) / 2, 3, Math.abs(barHeight));
        }

        // Subtitles Overlay text box
        ctx.font = "500 16px 'Inter'";
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(canvas.width / 2 - 240, canvas.height - 110, 480, 38);
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        
        const wordsToShow = scriptWords.slice(Math.floor(captionIndex / 4) * 4, Math.floor(captionIndex / 4) * 4 + 4).join(' ');
        ctx.fillText(wordsToShow || generationResult.script.substring(0, 40), canvas.width / 2, canvas.height - 86);
      } else {
        // Play Overlay HUD
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2 - 15, 32, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0e1715';
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 7, canvas.height / 2 - 25);
        ctx.lineTo(canvas.width / 2 + 14, canvas.height / 2 - 15);
        ctx.lineTo(canvas.width / 2 - 7, canvas.height / 2 - 5);
        ctx.closePath();
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    let captionInterval: any;
    if (isPlaying) {
      captionInterval = setInterval(() => {
        captionIndex = (captionIndex + 1) % scriptWords.length;
      }, 550);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(captionInterval);
    };
  }, [generationResult, isPlaying]);

  // Clean up media tracks on component unmount
  useEffect(() => {
    return () => {
      releaseMediaStreams();
    };
  }, []);

  // Safe release of mic and camera stream resources
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

  // Step 1: Initiate Mic Connection
  const initiateMicrophone = async () => {
    releaseMediaStreams();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicSignal(true);

      // Setup Web Audio Analyser
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
      // Soft-fallback: set as connected to let the simulation work seamlessly
      setMicSignal(true);
    }
  };

  // Start Mic Recording & Teleprompter
  const startVoiceRecording = () => {
    setIsRecordingVoice(true);
    setVoiceTimer(0);
  };

  // Stop Mic Recording
  const stopVoiceRecording = () => {
    setIsRecordingVoice(false);
    const mockFilename = `vocal_blueprint_studio_${Math.floor(Math.random() * 900) + 100}.wav`;
    setNewPersonaVoiceFile(mockFilename);
  };

  // Manage Voice Timer Counter
  useEffect(() => {
    let timer: any;
    if (isRecordingVoice) {
      timer = setInterval(() => {
        setVoiceTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecordingVoice]);

  // Audio Oscillograph Dynamic Canvas Loop
  useEffect(() => {
    if (wizardStep !== 1 || voiceSource !== 'record' || !oscillogramRef.current) return;
    const canvas = oscillogramRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background light fill
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#162a26'; // Beautiful crisp brand accent green stroke
      ctx.beginPath();

      if (analyserRef.current && isRecordingVoice) {
        // Real-time audio waveform mapping
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
        // Simulated harmonic wave when not recording or using simulated mic
        const sliceWidth = canvas.width / 100;
        let x = 0;
        const amplitude = isRecordingVoice ? 24 : 6;
        const speed = isRecordingVoice ? 0.15 : 0.04;

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
  }, [wizardStep, voiceSource, isRecordingVoice]);

  // Step 2: Initiate Camera Viewport
  const initiateCamera = async () => {
    releaseMediaStreams();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360 }
      });
      mediaStreamRef.current = stream;
      setCameraSignal(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Hardware Camera unavailable, loading high-fidelity Sandbox Simulation", err);
      setCameraSignal(true); // Gracefully unlock simulated camera viewport
    }
  };

  // Start Face Recording (with a cinematic 3s countdown pre-roll)
  const startFaceRecording = () => {
    setFaceCountdown(3);
  };

  // Countdown timer trigger
  useEffect(() => {
    let interval: any;
    if (faceCountdown > 0) {
      interval = setInterval(() => {
        setFaceCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // Finished counting down, active record stream
            setIsRecordingFace(true);
            setFaceTimer(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [faceCountdown]);

  // Handle Face Active Record Timer
  useEffect(() => {
    let timer: any;
    if (isRecordingFace) {
      timer = setInterval(() => {
        setFaceTimer(prev => {
          if (prev >= 8) {
            // Auto stop after 8 seconds (ideal avatar capture buffer)
            clearInterval(timer);
            setIsRecordingFace(false);
            const mockFilename = `mesh_profile_webcam_${Math.floor(Math.random() * 900) + 100}.mp4`;
            setNewPersonaFaceFile(mockFilename);
            return 8;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecordingFace]);

  // Step 3: Run High-Fidelity Diagnostics Scan & Save Persona
  const triggerDiagnosticsAndSave = () => {
    setWizardStep(3);
    setDiagnosticProgress(0);
    setDiagnosticLogs([
      "Establishing link with neural rendering network...",
      "Analyzing recorded acoustic frequencies...",
      "Normalizing volume thresholds and audio decibels..."
    ]);
  };

  // Diagnostic loading log simulation
  useEffect(() => {
    let interval: any;
    if (wizardStep === 3) {
      interval = setInterval(() => {
        setDiagnosticProgress(prev => {
          const next = prev + 10;
          
          if (next === 20) {
            setDiagnosticLogs(logs => [...logs, "Mapping specific vocal attributes and delivery speed..."]);
          }
          if (next === 40) {
            setDiagnosticLogs(logs => [...logs, "Calibrating head orientation and boundary anchors..."]);
          }
          if (next === 65) {
            setDiagnosticLogs(logs => [...logs, "Aligning gaze vectors, blinking, and lipsync movement..."]);
          }
          if (next === 85) {
            setDiagnosticLogs(logs => [...logs, "Securing and rendering private presenter model files..."]);
          }
          
          if (next >= 100) {
            clearInterval(interval);
            // Execute the actual persona addition
            setTimeout(() => {
              saveNewPersonaToRoster();
            }, 800);
            return 100;
          }
          return next;
        });
      }, 350);
    }
    return () => clearInterval(interval);
  }, [wizardStep]);

  // Commit Persona to State
  // Clean up and close wizard
  const resetAndCloseWizard = (targetTab?: 'generate' | 'personas') => {
    setShowAddModal(false);
    setNewPersonaName('');
    setNewPersonaVoiceFile(null);
    setNewPersonaFaceFile(null);
    setWizardStep(0);
    setVoiceSource('upload');
    setFaceSource('upload');
    if (targetTab) {
      setActiveTab(targetTab);
    }
  };

  // Commit Persona to State
  const saveNewPersonaToRoster = () => {
    if (!newPersonaName.trim()) return;

    const newPersona: Persona = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPersonaName,
      avatarUrl: null,
      voiceClipName: voiceSource === 'record' ? (newPersonaVoiceFile || 'studio_recorded_vocal.wav') : (newPersonaVoiceFile || 'uploaded_sample.wav'),
      faceClipName: faceSource === 'record' ? (newPersonaFaceFile || 'studio_recorded_mesh.mp4') : (newPersonaFaceFile || 'uploaded_mesh.mp4'),
      focus: personaFocus
    };

    const updated = [...personas, newPersona];
    setPersonas(updated);
    setSelectedPersona(newPersona);
    
    // Keep name in memory for the success step, release streams and route to step 4 (Success)
    releaseMediaStreams();
    setWizardStep(4);
  };

  // Start Pipeline Trigger
  const handleGenerate = () => {
    if (!selectedPersona) return;
    setGenerationResult(null);
    setIsGenerating(true);
    setGenerationProgress(0);
    setElapsedTime(0);
  };


  // Delete Persona
  const handleDeletePersona = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = personas.filter(p => p.id !== id);
    setPersonas(updated);
    if (selectedPersona?.id === id) {
      setSelectedPersona(updated.length > 0 ? updated[0] : null);
    }
  };

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* SaaS Premium Left Sidebar Layout */}
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
              {/* Seamless bold Spade lobes and concave curved stem matching original artwork */}
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
            className={`nav-tab ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            <Sparkles size={18} />
            Video Studio
          </button>
          <button 
            className={`nav-tab ${activeTab === 'personas' ? 'active' : ''}`}
            onClick={() => setActiveTab('personas')}
          >
            <UserCheck size={18} />
            Manage Personas
          </button>
        </nav>

      </aside>

      {/* Main Right Full-Viewport Content Area */}
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
          </div>
          <div className="user-profile">
            <div className="user-avatar" style={{ background: 'var(--accent-dark)', color: '#ffffff' }}>AD</div>
            <div className="user-meta">
              <h4 style={{ color: 'var(--text-dark)', fontSize: '13px', fontWeight: 600 }}>Admin Studio</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>INTERNAL ACCOUNT</p>
            </div>
          </div>
        </header>

        {/* VIEW 1: VIDEO STUDIO VIEWPORT */}
        {activeTab === 'generate' && (
          <div className="workspace-scroll-container">
            <div className="workspace-grid">
              {/* Left Panel: Inputs & Personas */}
              <div className="studio-panel">
                {/* Script Text Input */}
                <div className="script-container">
                  <label className="section-title">
                    <Sparkles size={16} /> Spoken Script Content
                  </label>
                  <textarea 
                    className="script-textarea"
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Write the script for your avatar to speak. Use natural language, pauses, and clear structure."
                  />
                  <div className="script-footer">
                    <span>Recommended: 50 - 500 words for social hooks</span>
                    <span>{script.split(/\s+/).filter(Boolean).length} words</span>
                  </div>
                </div>

                {/* Persona Selection */}
                <div className="persona-selector">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="section-title" style={{ margin: 0 }}>
                      <UserCheck size={16} /> Presenter Persona
                    </label>
                  </div>

                  <div 
                    className="file-upload-zone"
                    onClick={() => setShowAddModal(true)}
                    style={{ borderStyle: 'dashed', padding: '36px', background: '#fcfdfd' }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '15px' }}>Standard AI Presenter Active</span>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '440px', margin: '4px auto 0' }}>
                      Currently using our built-in high-fidelity presenter. To clone your custom voice and face, create a custom persona.
                    </p>
                    <button 
                      type="button" 
                      className="btn-primary-small"
                      style={{ marginTop: '16px', padding: '8px 16px', fontSize: '13px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddModal(true);
                      }}
                    >
                      + Create Custom Clone
                    </button>
                  </div>
                </div>

                {/* History Section */}
                {history.length > 0 && (
                  <div className="history-section">
                    <h3 className="section-title" style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <Clock size={14} /> History (This Session)
                    </h3>
                    <div className="history-list">
                      {history.map((item) => {
                        const initials = item.persona.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                        return (
                          <div 
                            key={item.id} 
                            className="history-item"
                            onClick={() => {
                              setScript(item.script);
                              setSelectedPersona(item.persona);
                              setVoiceModel(item.voiceModel);
                              setFaceModel(item.faceModel);
                              setGenerationResult({
                                script: item.script,
                                persona: item.persona,
                                voiceModel: item.voiceModel,
                                faceModel: item.faceModel,
                                videoUrl: '#'
                              });
                            }}
                          >
                            <div className="history-meta">
                              <div className="history-avatar-sm" style={{ background: 'var(--accent-dark)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                {initials}
                              </div>
                              <div className="history-info">
                                <h4>{item.persona.name}</h4>
                                <p>{item.script}</p>
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{item.timestamp}</span>
                              <span>•</span>
                              <span>{item.duration}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel: Settings / Generation Pipeline State */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 1. Normal Settings State */}
                {!isGenerating && !generationResult && (
                  <div className="settings-panel">
                    <h3 className="section-title" style={{ marginBottom: '4px' }}>
                      <Sliders size={16} /> Generation Engine Settings
                    </h3>
                    
                    {/* Simplified user-friendly labels */}
                    <div className="settings-group">
                      <span className="settings-label">Vocal Clone Setting</span>
                      <select 
                        className="custom-select"
                        value={voiceModel}
                        onChange={(e) => setVoiceModel(e.target.value)}
                      >
                        <option value="Standard Voice">Standard Voice (Recommended)</option>
                        <option value="Conversational Narrator">Conversational Narrator</option>
                        <option value="Warm Conversational">Warm Conversational</option>
                      </select>
                    </div>

                    <div className="settings-group">
                      <span className="settings-label">Avatar Face Setting</span>
                      <select 
                        className="custom-select"
                        value={faceModel}
                        onChange={(e) => setFaceModel(e.target.value)}
                      >
                        <option value="Standard Avatar">Standard Avatar (Lipsynced)</option>
                        <option value="Expressive Cinematic">Expressive Cinematic</option>
                        <option value="Ultra-HD Portrait">Ultra-HD Portrait</option>
                      </select>
                    </div>

                    <div style={{ flexGrow: 1, minHeight: '40px' }}></div>

                    <button 
                      className="btn-generate"
                      onClick={handleGenerate}
                      disabled={!script.trim() || !selectedPersona}
                      title={!selectedPersona ? "Please create a speaking persona first" : ""}
                    >
                      <Sparkles size={16} /> Generate Video Asset
                    </button>
                  </div>
                )}

                {/* 2. Generation Processing Pipeline Overlay */}
                {isGenerating && (
                  <div className="generation-card">
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
                      <div className="timer-display">{elapsedTime}s</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h3 className="stage-title">{stages[generationStage].title}...</h3>
                      <p className="stage-desc">{stages[generationStage].desc}</p>
                    </div>

                    <div className="stage-tracker">
                      {stages.map((stg, idx) => (
                        <div 
                          key={idx} 
                          className={`tracker-item ${idx < generationStage ? 'completed' : idx === generationStage ? 'active' : ''}`}
                        >
                          <div className="dot-indicator"></div>
                          <span>{stg.title}</span>
                          {idx < generationStage && <CheckCircle2 size={12} style={{ color: '#1e7a44', marginLeft: 'auto' }} />}
                          {idx === generationStage && <Loader2 size={12} className="animate-spin" style={{ marginLeft: 'auto' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Output Preview Presentation Panel */}
                {!isGenerating && generationResult && (
                  <div className="result-card">
                    <h3 className="section-title" style={{ marginBottom: '2px' }}>
                      <CheckCircle2 size={16} style={{ color: '#1e7a44' }} /> Video Rendering Completed
                    </h3>

                    {/* Speaker Canvas Player Preview */}
                    <div className="result-video-wrapper" onClick={() => setIsPlaying(!isPlaying)}>
                      <canvas 
                        ref={canvasRef} 
                        className="speaking-canvas" 
                        width={640} 
                        height={360}
                      />
                      <div className="pipeline-badge">
                        {generationResult.voiceModel} • {generationResult.faceModel}
                      </div>
                    </div>

                    <div className="result-controls">
                      <button 
                        className="btn-secondary"
                        onClick={() => {
                          setIsPlaying(false);
                          setGenerationResult(null);
                        }}
                      >
                        <RotateCcw size={14} /> Adjust Script
                      </button>
                      <button 
                        className="btn-primary-small"
                        onClick={() => {
                          const blob = new Blob([script], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `rendered_${generationResult.persona.name.replace(/\s+/g, '_')}_social_asset_pack.txt`;
                          a.click();
                        }}
                      >
                        <Download size={14} /> Download Render Pack
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: MANAGE PERSONAS PANEL */}
        {activeTab === 'personas' && (
          <div className="persona-admin-container">
            <div className="persona-admin-header">
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: '700' }}>Manage Team Personas</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Clone, replace, and audit voice/visual references used to synthesize videos.
                </p>
              </div>
              <button className="btn-primary-small" onClick={() => setShowAddModal(true)}>
                <UserPlus size={14} /> Create Persona
              </button>
            </div>

            {personas.length === 0 ? (
              <div 
                className="generation-card"
                style={{ minHeight: '300px', background: 'var(--accent-light)' }}
              >
                <UserPlus size={36} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <h3 className="stage-title">Start Cloning Personas</h3>
                  <p className="stage-desc" style={{ marginTop: '4px' }}>Add reference files to populate your studio roster.</p>
                </div>
                <button 
                  type="button" 
                  className="btn-primary-small"
                  style={{ padding: '10px 20px' }}
                  onClick={() => setShowAddModal(true)}
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
                    const isActive = selectedPersona?.id === persona.id;

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
                            setSelectedPersona(persona);
                            setActiveTab('generate');
                          }}
                        >
                          {isActive ? 'Selected' : 'Use in Studio'}
                        </button>
                        <div className="secondary-actions-group">
                          <button 
                            className="btn-studio-icon"
                            onClick={() => {
                              setNewPersonaName(persona.name);
                              setNewPersonaVoiceFile(persona.voiceClipName || null);
                              setNewPersonaFaceFile(persona.faceClipName || null);
                              setShowAddModal(true);
                            }}
                            title="Configure Settings"
                          >
                            <Settings2 size={13} />
                          </button>
                          <button 
                            className="btn-studio-icon danger"
                            onClick={(e) => handleDeletePersona(persona.id, e)}
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

      {/* CREATE / EDIT PERSONA DIALOG MODAL (UPGRADED ELITE WIZARD) */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content elite-wizard">
            {/* Elegant Top Neon Progress bar */}
            <div className="wizard-progress-bar">
              <div 
                className="wizard-progress-fill" 
                style={{ width: wizardStep === 4 ? '100%' : `${(wizardStep / 3) * 100}%` }}
              ></div>
            </div>

            {/* Header displaying step progression */}
            <div className="wizard-steps-header">
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: '800' }}>
                  {wizardStep === 0 && "Name Your Presenter"}
                  {wizardStep === 1 && "Set Up Their Voice"}
                  {wizardStep === 2 && "Set Up Their Face"}
                  {wizardStep === 3 && "Creating Your Presenter..."}
                  {wizardStep === 4 && "✨ Presenter Created Successfully!"}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {wizardStep === 0 && "Give your AI presenter a name and style."}
                  {wizardStep === 1 && "Choose how we should create your presenter's voice."}
                  {wizardStep === 2 && "Choose how we should create your presenter's face."}
                  {wizardStep === 3 && "We are generating your custom AI presenter. This will take just a moment."}
                  {wizardStep === 4 && "Your voice clone and face references are compiled and live!"}
                </p>
              </div>
              <div className="wizard-steps-indicator" style={{ background: wizardStep === 4 ? '#e6fbf4' : 'rgba(15,28,26,0.04)', color: wizardStep === 4 ? '#00b894' : 'var(--text-dark)' }}>
                {wizardStep === 4 ? "Complete!" : `Step ${wizardStep + 1} of 4`}
              </div>
            </div>

            {/* STEP 0: PERSONA IDENTIFIERS */}
            {wizardStep === 0 && (() => {
              const getValidationError = () => {
                const trimmed = newPersonaName.trim();
                if (!newPersonaName) return null; // Show no error when empty to start clean
                if (trimmed.length < 2) {
                  return "Name must be at least 2 characters.";
                }
                if (trimmed.length > 30) {
                  return "Name cannot exceed 30 characters.";
                }
                const validCharRegex = /^[a-zA-Z0-9\s'-]+$/;
                if (!validCharRegex.test(trimmed)) {
                  return "Only letters, numbers, spaces, hyphens, and apostrophes are allowed.";
                }
                // Prevent consecutive repetitive spam characters (e.g., 'sss', 'jjj', 'aaa')
                // Real names can have at most 2 identical consecutive characters (e.g. 'Aaron', 'Lee')
                const repeatedCharsRegex = /(.)\1\1/;
                if (repeatedCharsRegex.test(trimmed)) {
                  return "Invalid name: Too many repeating consecutive characters.";
                }

                // Prevent names made of a single character repeated (e.g. 'aaaaa')
                const alphabeticLettersOnly = trimmed.toLowerCase().replace(/[^a-z]/g, '');
                const uniqueChars = new Set(alphabeticLettersOnly);
                if (trimmed.length >= 3 && uniqueChars.size < 2) {
                  return "Invalid name: Please provide a realistic name with distinct characters.";
                }

                // Check if duplicate name exists in roster
                const nameExists = personas.some(p => p.name.toLowerCase() === trimmed.toLowerCase());
                if (nameExists) {
                  return "A presenter with this name already exists in your team.";
                }
                return null;
              };

              const nameError = getValidationError();
              const isNameInvalid = !!nameError || !newPersonaName.trim();

              return (
                <div className="modal-form">
                  <div className="form-group">
                    <label>Presenter Name</label>
                    <input 
                      type="text" 
                      className={`form-input ${nameError ? 'error-state' : ''}`} 
                      placeholder="e.g. Sarah"
                      value={newPersonaName}
                      onChange={(e) => setNewPersonaName(e.target.value)}
                      required 
                      style={nameError ? { borderColor: '#e84118', boxShadow: '0 0 0 3px rgba(232, 65, 24, 0.1)' } : {}}
                    />
                    {nameError && (
                      <span className="form-error-text" style={{ color: '#e84118', fontSize: '12px', marginTop: '6px', display: 'block', fontWeight: 500 }}>
                        ⚠️ {nameError}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Presenter Style</label>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Choose how you want your presenter to sound and talk:
                    </p>
                    <div className="blueprint-focus-grid">
                      <button 
                        type="button"
                        className={`blueprint-focus-card ${personaFocus === 'corporate' ? 'active' : ''}`}
                        onClick={() => setPersonaFocus('corporate')}
                      >
                        <span className="focus-emoji">🎯</span>
                        <div className="focus-content">
                          <strong>Professional Tone</strong>
                          <p>Best for business, presentations, and formal talks.</p>
                        </div>
                      </button>
                      
                      <button 
                        type="button"
                        className={`blueprint-focus-card ${personaFocus === 'social' ? 'active' : ''}`}
                        onClick={() => setPersonaFocus('social')}
                      >
                        <span className="focus-emoji">⚡</span>
                        <div className="focus-content">
                          <strong>Casual / Social Tone</strong>
                          <p>Best for social media, friendly videos, and high energy.</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="modal-footer" style={{ borderTop: '1px solid rgba(15,28,26,0.06)', paddingTop: '16px' }}>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => {
                        releaseMediaStreams();
                        setShowAddModal(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn-primary-small"
                      disabled={isNameInvalid}
                      onClick={() => setWizardStep(1)}
                    >
                      Next: Voice Setup
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* STEP 1: VOCAL SETUP */}
            {wizardStep === 1 && (
              <div className="modal-form">
                {/* Segmented Selector */}
                <div className="studio-tab-selector">
                  <button 
                    type="button" 
                    className={`studio-tab-btn ${voiceSource === 'upload' ? 'active' : ''}`}
                    onClick={() => { setVoiceSource('upload'); releaseMediaStreams(); }}
                  >
                    <FileAudio size={14} /> Upload Voice File
                  </button>
                  <button 
                    type="button" 
                    className={`studio-tab-btn ${voiceSource === 'record' ? 'active' : ''}`}
                    onClick={() => { setVoiceSource('record'); initiateMicrophone(); }}
                  >
                    <Mic size={14} /> Record Your Voice
                  </button>
                </div>

                {voiceSource === 'upload' ? (
                  <div className="form-group">
                    <label>Upload Voice Sample</label>
                    <div 
                      className="file-upload-zone"
                      onClick={() => setNewPersonaVoiceFile('cloned_vocal_' + Math.floor(Math.random()*1000) + '_profile.wav')}
                    >
                      {newPersonaVoiceFile ? (
                        <div className="file-uploaded-indicator">
                          <FileAudio size={14} /> {newPersonaVoiceFile} (Saved)
                        </div>
                      ) : (
                        <>
                          <FileAudio size={18} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontWeight: 600 }}>Click to upload a voice file (.wav, .mp3)</span>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Recommended: A clear 30-second recording with no background noise.</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="studio-recording-hud">
                    {/* Live signal testing bar */}
                    <div className="device-signal-check">
                      <div className={`signal-dot ${micSignal ? 'connected' : ''}`}></div>
                      {micSignal ? "Microphone is connected" : "Looking for microphone..."}
                    </div>

                    {/* Interactive waveform oscillograph */}
                    <canvas 
                      ref={oscillogramRef} 
                      className="studio-oscillogram-canvas"
                      width={600}
                      height={80}
                    />

                    {/* Script Teleprompter to read */}
                    <div className="studio-teleprompter">
                      <span className="prompter-highlight">Read this aloud to give permission:</span> <br/>
                      "I allow Naqalchi to copy my voice to generate videos for my projects."
                    </div>

                    {/* Capturing Controller Button */}
                    <div className="studio-recording-actions">
                      <button 
                        type="button"
                        className={`btn-studio-record ${isRecordingVoice ? 'recording' : ''}`}
                        onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                        title={isRecordingVoice ? "Stop recording voice" : "Start recording voice"}
                      >
                        <Mic size={20} />
                      </button>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        {isRecordingVoice ? `Recording: ${voiceTimer} seconds` : "Click microphone to start"}
                      </div>
                    </div>

                    {newPersonaVoiceFile && !isRecordingVoice && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginTop: '4px' }}>
                        <CheckCircle2 size={14} style={{ color: '#25d366' }} />
                        <span>Voice recording saved successfully!</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="modal-footer" style={{ borderTop: '1px solid rgba(15,28,26,0.06)', paddingTop: '16px' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => {
                      releaseMediaStreams();
                      setWizardStep(0);
                    }}
                  >
                    Back
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary-small"
                    disabled={!newPersonaVoiceFile}
                    onClick={() => {
                      setWizardStep(2);
                      if (faceSource === 'record') initiateCamera();
                    }}
                  >
                    Next: Face Setup
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: VISUAL PORTRAIT SETUP */}
            {wizardStep === 2 && (
              <div className="modal-form">
                {/* Segmented Selector */}
                <div className="studio-tab-selector">
                  <button 
                    type="button" 
                    className={`studio-tab-btn ${faceSource === 'upload' ? 'active' : ''}`}
                    onClick={() => { setFaceSource('upload'); releaseMediaStreams(); }}
                  >
                    <FileVideo size={14} /> Upload Video
                  </button>
                  <button 
                    type="button" 
                    className={`studio-tab-btn ${faceSource === 'record' ? 'active' : ''}`}
                    onClick={() => { setFaceSource('record'); initiateCamera(); }}
                  >
                    <Video size={14} /> Record with Webcam
                  </button>
                </div>

                {faceSource === 'upload' ? (
                  <div className="form-group">
                    <label>Upload Video Sample</label>
                    <div 
                      className="file-upload-zone"
                      onClick={() => setNewPersonaFaceFile('mesh_matrix_' + Math.floor(Math.random()*1000) + '_reference.mp4')}
                    >
                      {newPersonaFaceFile ? (
                        <div className="file-uploaded-indicator">
                          <FileVideo size={14} /> {newPersonaFaceFile} (Saved)
                        </div>
                      ) : (
                        <>
                          <FileVideo size={18} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontWeight: 600 }}>Click to upload a video file (.mp4, .mov)</span>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Recommended: A clear video looking directly at the camera (15 to 60 seconds).</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="studio-recording-hud">
                    {/* Live signal testing bar */}
                    <div className="device-signal-check">
                      <div className={`signal-dot ${cameraSignal ? 'connected' : ''}`}></div>
                      {cameraSignal ? "Camera is connected" : "Looking for camera..."}
                    </div>

                    {/* Viewfinder Window */}
                    <div className="webcam-viewfinder-wrapper">
                      {/* Real WebCam Viewport */}
                      {mediaStreamRef.current ? (
                        <video 
                          ref={videoRef} 
                          className="webcam-video-feed" 
                          autoPlay 
                          playsInline 
                          muted 
                        />
                      ) : (
                        /* Simulated wireframe face mesh if camera denied/loading */
                        <div className="webcam-feed-simulation">
                          <div className="simulation-wireframe"></div>
                        </div>
                      )}

                      {/* Oval anatomical guides mask */}
                      <div className={`webcam-face-oval-guide ${isRecordingFace ? 'active' : ''}`}></div>

                      {/* Studio Brackets OSD */}
                      <div className="hud-corner-bracket hud-tl"></div>
                      <div className="hud-corner-bracket hud-tr"></div>
                      <div className="hud-corner-bracket hud-bl"></div>
                      <div className="hud-corner-bracket hud-br"></div>

                      {/* Studio specs telemetry */}
                      <div className="hud-telemetry">1080p • 60 FPS</div>

                      {/* Active recording blinking tag */}
                      {isRecordingFace && (
                        <div className="hud-rec-badge">
                          <div className="hud-rec-dot blinking"></div>
                          <span>LIVE</span>
                        </div>
                      )}

                      {/* Countdown Numbers Overlay */}
                      {faceCountdown > 0 && (
                        <div className="webcam-countdown-overlay">
                          {faceCountdown}
                        </div>
                      )}
                    </div>

                    {/* Teleprompter prompt instructions */}
                    <div className="studio-teleprompter" style={{ borderLeftColor: '#ff3b30' }}>
                      <span className="prompter-highlight" style={{ color: '#ff453a' }}>Tips for recording:</span> <br/>
                      Keep your face centered in the oval. Look directly at the lens, blink naturally, and speak clearly.
                    </div>

                    {/* Camera Control Trigger */}
                    <div className="studio-recording-actions">
                      <button 
                        type="button"
                        className={`btn-studio-record ${isRecordingFace ? 'recording' : ''}`}
                        onClick={startFaceRecording}
                        disabled={faceCountdown > 0 || isRecordingFace}
                        title="Start webcam recording countdown"
                      >
                        <Camera size={20} />
                      </button>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        {faceCountdown > 0 ? "Starting Countdown..." : isRecordingFace ? `Recording: ${faceTimer} of 8 seconds` : "Click camera to start"}
                      </div>
                    </div>

                    {newPersonaFaceFile && !isRecordingFace && faceCountdown === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginTop: '4px' }}>
                        <CheckCircle2 size={14} style={{ color: '#25d366' }} />
                        <span>Video recording saved successfully!</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="modal-footer" style={{ borderTop: '1px solid rgba(15,28,26,0.06)', paddingTop: '16px' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => {
                      releaseMediaStreams();
                      setWizardStep(1);
                      if (voiceSource === 'record') initiateMicrophone();
                    }}
                  >
                    Back
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary-small"
                    disabled={!newPersonaFaceFile || isRecordingFace || faceCountdown > 0}
                    onClick={triggerDiagnosticsAndSave}
                  >
                    Create Presenter
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: RECTIFIED DIAGNOSTICS SCAN STATUS */}
            {wizardStep === 3 && (
              <div className="diagnostic-wizard-panel">
                {/* Glowing Scanner Disk */}
                <div className="diagnostic-mesh-visualizer">
                  <div className="diagnostic-scanner-line"></div>
                  {voiceSource === 'record' ? <Mic size={32} style={{ color: 'var(--accent-dark)' }} /> : <Camera size={32} style={{ color: 'var(--accent-dark)' }} />}
                </div>

                {/* Subtitle updates */}
                <div>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: '700' }}>
                    Applying your settings... ({diagnosticProgress}%)
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Preparing your presenter's custom voice and look. Just a moment!
                  </p>
                </div>

                {/* Cinema Ticker Status Screen */}
                <div className="diagnostic-ticker-container">
                  <div className="diagnostic-progress-bar-wrapper">
                    <div className="diagnostic-progress-bar-fill" style={{ width: `${diagnosticProgress}%` }}></div>
                  </div>
                  <div className="diagnostic-ticker-active">
                    <div className="glow-ring-spinner"></div>
                    <span key={diagnosticLogs.length} className="ticker-text-fade-in">
                      {diagnosticLogs[diagnosticLogs.length - 1] || "Initializing neural settings..."}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* STEP 4: SUCCESS CONFIRMATION AND ONBOARDING */}
            {wizardStep === 4 && (
              <div className="diagnostic-wizard-panel success-panel" style={{ textAlign: 'center', padding: '10px 0 20px' }}>

                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)' }}>
                    Presenter "{newPersonaName}" is Live!
                  </h3>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5', maxWidth: '420px', margin: '8px auto 0' }}>
                    Your custom presenter has been fully compiled and is now selected as your **active speaker clone** in the Video Studio.
                  </p>
                </div>


                <div className="modal-footer" style={{ borderTop: '1px solid rgba(15,28,26,0.06)', paddingTop: '20px', width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                  <button 
                    type="button" 
                    className="btn-primary-small"
                    style={{ maxWidth: '240px', width: '100%' }}
                    onClick={() => resetAndCloseWizard('personas')}
                  >
                    Go to Cloned Persona
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
