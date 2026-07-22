import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  RotateCcw, 
  Plus, 
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
  FileVideo
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
  faceModel: string;
  timestamp: string;
  duration: string;
}

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'generate' | 'personas'>('generate');

  // Application State - Personas (Starts empty by default as requested)
  const [personas, setPersonas] = useState<Persona[]>(() => {
    const saved = localStorage.getItem('naqalchi_personas');
    if (saved) return JSON.parse(saved);
    return []; // Empty by default
  });

  // Persist Personas
  useEffect(() => {
    localStorage.setItem('naqalchi_personas', JSON.stringify(personas));
  }, [personas]);

  // Main Generator State
  const [script, setScript] = useState<string>(
    "Welcome to Naqalchi. This is a production-ready system designed to generate polished, branded social media content. Type your script, create your custom speaking personas with vocal samples, select your desired studio settings, and generate professional speaking video assets instantly."
  );
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(() => {
    return personas.length > 0 ? personas[0] : null;
  });

  // Synchronize selection if personas list changes
  useEffect(() => {
    if (personas.length > 0 && !selectedPersona) {
      setSelectedPersona(personas[0]);
    } else if (personas.length === 0) {
      setSelectedPersona(null);
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

  // Start Pipeline Trigger
  const handleGenerate = () => {
    if (!selectedPersona) return;
    setGenerationResult(null);
    setIsGenerating(true);
    setGenerationProgress(0);
    setElapsedTime(0);
  };

  // Add custom persona handler
  const handleAddPersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonaName.trim()) return;

    const newPersona: Persona = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPersonaName,
      avatarUrl: null,
      voiceClipName: newPersonaVoiceFile || 'vocal_reference.wav',
      faceClipName: newPersonaFaceFile || 'avatar_mesh_reference.mp4'
    };

    const updated = [...personas, newPersona];
    setPersonas(updated);
    setSelectedPersona(newPersona);
    setShowAddModal(false);
    setNewPersonaName('');
    setNewPersonaVoiceFile(null);
    setNewPersonaFaceFile(null);
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
    <div className="app-container">
      {/* SaaS Premium Left Sidebar Layout */}
      <aside className="app-sidebar">
        <div className="brand-section">
          <div className="brand-logo">N</div>
          <div className="brand-info">
            <h1>Naqalchi</h1>
            <p>AI CREATIVE SUITE</p>
          </div>
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

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">AD</div>
            <div className="user-meta">
              <h4 style={{ color: '#ffffff' }}>Admin Studio</h4>
              <p>INTERNAL ACCOUNT</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Right Full-Viewport Content Area */}
      <main className="main-content">
        <header className="top-header">
          <h2 className="page-title">
            {activeTab === 'generate' ? 'Video Generation Studio' : 'Manage Presenters'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Production Environment v2.4
            </span>
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
                  <label className="section-title">
                    <UserCheck size={16} /> Presenter Persona
                  </label>

                  {personas.length === 0 ? (
                    <div 
                      className="file-upload-zone"
                      onClick={() => setShowAddModal(true)}
                      style={{ borderStyle: 'dashed', padding: '36px', background: '#fcfdfd' }}
                    >
                      <UserPlus size={24} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>No Personas Added Yet</span>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Create your first speaking avatar with vocal reference clips to get started.
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
                        + Add Persona
                      </button>
                    </div>
                  ) : (
                    <div className="persona-grid">
                      {personas.map((persona) => {
                        const initials = persona.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                        return (
                          <div 
                            key={persona.id}
                            className={`persona-card ${selectedPersona?.id === persona.id ? 'active' : ''}`}
                            onClick={() => setSelectedPersona(persona)}
                          >
                            <div className="persona-thumbnail-wrapper">
                              <div className="persona-initials">{initials}</div>
                            </div>
                            <span className="persona-name">{persona.name}</span>
                          </div>
                        );
                      })}

                      {/* Inline Quick Add Persona button */}
                      <div 
                        className="persona-card"
                        style={{ borderStyle: 'dashed', background: 'transparent' }}
                        onClick={() => setShowAddModal(true)}
                      >
                        <div 
                          className="persona-thumbnail-wrapper"
                          style={{ background: 'var(--accent-light)', border: '1px dashed var(--border-color)' }}
                        >
                          <Plus size={20} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <span className="persona-name" style={{ color: 'var(--text-muted)' }}>Add Persona</span>
                      </div>
                    </div>
                  )}
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
                {personas.map((persona) => {
                  const initials = persona.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <div key={persona.id} className="persona-admin-card">
                      <div className="persona-admin-image-wrapper">
                        <div className="persona-initials" style={{ fontSize: '24px' }}>{initials}</div>
                      </div>
                      <div className="persona-admin-details">
                        <div>
                          <h3>{persona.name}</h3>
                          <div className="persona-admin-files">
                            <div className="file-status ready">
                              <FileAudio size={12} /> {persona.voiceClipName}
                            </div>
                            <div className="file-status ready">
                              <FileVideo size={12} /> {persona.faceClipName}
                            </div>
                          </div>
                        </div>

                        <div className="persona-admin-actions">
                          <button 
                            className="btn-action-icon"
                            onClick={() => {
                              setNewPersonaName(persona.name);
                              setNewPersonaVoiceFile(persona.voiceClipName);
                              setNewPersonaFaceFile(persona.faceClipName);
                              setShowAddModal(true);
                            }}
                          >
                            <Settings2 size={14} />
                          </button>
                          <button 
                            className="btn-action-icon delete"
                            onClick={(e) => handleDeletePersona(persona.id, e)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE / EDIT PERSONA DIALOG MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Configure Presenter Persona</h2>
              <button 
                className="btn-action-icon"
                onClick={() => setShowAddModal(false)}
                style={{ borderRadius: '50%' }}
              >
                <Plus size={18} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            <form onSubmit={handleAddPersona} className="modal-form">
              <div className="form-group">
                <label>Persona Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Priyanth"
                  value={newPersonaName}
                  onChange={(e) => setNewPersonaName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Voice Clone Sample (Audio)</label>
                <div 
                  className="file-upload-zone"
                  onClick={() => setNewPersonaVoiceFile('cloned_vocal_' + Math.floor(Math.random()*1000) + '_profile.wav')}
                >
                  {newPersonaVoiceFile ? (
                    <div className="file-uploaded-indicator">
                      <FileAudio size={14} /> {newPersonaVoiceFile} (Configured)
                    </div>
                  ) : (
                    <>
                      <FileAudio size={18} style={{ color: 'var(--text-muted)' }} />
                      <span>Upload vocal profile sample (.wav, .mp3)</span>
                    </>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Visual Mesh Sample (Video)</label>
                <div 
                  className="file-upload-zone"
                  onClick={() => setNewPersonaFaceFile('mesh_matrix_' + Math.floor(Math.random()*1000) + '_reference.mp4')}
                >
                  {newPersonaFaceFile ? (
                    <div className="file-uploaded-indicator">
                      <FileVideo size={14} /> {newPersonaFaceFile} (Configured)
                    </div>
                  ) : (
                    <>
                      <FileVideo size={18} style={{ color: 'var(--text-muted)' }} />
                      <span>Upload video mesh baseline reference (.mp4, .mov)</span>
                    </>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 'none', padding: '8px 16px' }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary-small"
                  style={{ flex: 'none', padding: '8px 20px' }}
                >
                  Configure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
