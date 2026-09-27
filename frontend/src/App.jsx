import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

function TrackingEye({ status }) {
  const eyeRef = useRef(null);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  const handleMove = useCallback((e) => {
    if (!eyeRef.current) return;

    const rect = eyeRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(Math.hypot(dx, dy) / 18, 12);

    setPupil({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
    };
  }, [handleMove]);

  useEffect(() => {
    let timeout;
    const scheduleBlink = () => {
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 160);
        scheduleBlink();
      }, 2600 + Math.random() * 3200);
    };
    scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className={`eye-wrap eye-${status}`} ref={eyeRef} aria-hidden="true">
      
      <div className="eye-orbit orbit-two" />
      <div className="eye-glow" />

      <svg viewBox="0 0 300 300" className="eye-svg">
        <defs>
          <radialGradient id="sclera" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#f3e8ff" />
            <stop offset="100%" stopColor="#d8b4fe" />
          </radialGradient>

          <radialGradient id="iris" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f0abfc" />
            <stop offset="30%" stopColor="#d946ef" />
            <stop offset="65%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b0764" />
          </radialGradient>

          <radialGradient id="pupilShine" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <filter id="eyeShadow">
            <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#000000" floodOpacity="0.5" />
          </filter>
        </defs>

        <clipPath id="eyeShape">
          <path d="M10,150 C60,40 240,40 290,150 C240,260 60,260 10,150 Z" />
        </clipPath>

        <g clipPath="url(#eyeShape)" filter="url(#eyeShadow)">
          <ellipse cx="150" cy="150" rx="150" ry="115" fill="url(#sclera)" />

          <g style={{ transform: `translate(${pupil.x}px, ${pupil.y}px)`, transition: 'transform 90ms linear' }}>
            <circle cx="150" cy="150" r="66" fill="url(#iris)" />
            <circle cx="150" cy="150" r="66" fill="none" stroke="#2e1065" strokeWidth="3" opacity="0.7" />
            <circle cx="150" cy="150" r="48" fill="none" stroke="#f5d0fe" strokeWidth="1.5" strokeDasharray="4 7" opacity="0.5" />
            <circle cx="150" cy="150" r="28" fill="#090514" />
            <circle cx="138" cy="136" r="12" fill="url(#pupilShine)" />
          </g>

          <rect className="scan-line" x="0" y="0" width="300" height="6" fill="#f0abfc" opacity="0" />

          <path
            className="eyelid"
            d="M10,150 C60,40 240,40 290,150 C240,150 60,150 10,150 Z"
            fill="#0b071a"
            style={{ transform: blink ? 'scaleY(1)' : 'scaleY(0)' }}
          />
        </g>

        <path d="M10,150 C60,40 240,40 290,150 C240,260 60,260 10,150 Z" fill="none" stroke="#a855f7" strokeWidth="3" opacity="0.6" />
      </svg>
    </div>
  );
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const MAX_FILE_SIZE_MB = 10;

  const selectFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Image is too large. Please upload a file under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setResult(null);
    setError(null);
  };

  // Revoke the object URL when the component unmounts or the preview changes,
  // so we don't leak memory from unreleased blob URLs.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e) => selectFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    selectFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Server response error');
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Backend connection failed. Please ensure main.py server is running at port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const eyeStatus = loading ? 'scanning' : result ? 'done' : 'idle';

  return (
    <div className="page">
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-one" />
      <div className="bg-glow bg-glow-two" />

      <header className="header">
        

        <TrackingEye status={eyeStatus} />

        <div className="status-pill">
          <span className={`status-dot ${eyeStatus}`} />
          {loading ? 'AI ANALYSIS IN PROGRESS' : result ? 'ANALYSIS COMPLETE' : 'SYSTEM READY'}
        </div>

        <h1>
          RetinaAI <span>Scanner</span>
        </h1>

        <p>
          Upload a retinal fundus image for AI-assisted screening of common ocular conditions.
        </p>
      </header>

      <main className="main">
        <section
          className={`dropzone ${dragActive ? 'drag-active' : ''} ${previewUrl ? 'has-preview' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {!previewUrl ? (
            <div className="placeholder">
              <div className="upload-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 16V4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 20h14" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="upload-title">Upload Retinal Image</div>
              <p>Drag & drop your retinal scan here, or browse files from your computer</p>
              
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handleFileChange} 
                id="file-input" 
              />
              
              <label htmlFor="file-input" className="btn-secondary">
                Browse Files
              </label>

              
            </div>
          ) : (
            <div className="preview">
              <div className="preview-header">
                <span>RETINAL SCAN LOADED</span>
                <span className="image-ready">● READY FOR ANALYSIS</span>
              </div>
              <div className="image-frame">
                <img src={previewUrl} alt="Retinal fundus scan preview" className="preview-img" />
                <div className="image-scan-line" />
              </div>
              <div className="file-info">
                <div>
                  <strong>{selectedFile.name}</strong>
                  <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button className="remove-btn" onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setResult(null);
                }}>
                  Change Image
                </button>
              </div>
            </div>
          )}
        </section>

        {selectedFile && (
          <button onClick={handleAnalyze} disabled={loading} className="btn-primary">
            <span>{loading ? 'Analyzing Retinal Layers...' : 'Run Diagnostic Scan'}</span>
            {!loading && <span className="arrow">→</span>}
            {loading && <span className="loader" />}
          </button>
        )}

        {error && (
          <div className="error-box">
            <span className="error-icon">!</span>
            <div>
              <strong>Connection Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {result && (
          <section className="result-card">
            <div className="result-top">
              <div>
                <span className="result-label">AI SCREENING RESULT</span>
                <h2>{result.prediction}</h2>
              </div>
              <div className="result-check">✓</div>
            </div>
            <div className="confidence-box">
              <div className="confidence-heading">
                <span>Diagnostic Confidence</span>
                <strong>{result.confidence}</strong>
              </div>
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{ width: `${parseFloat(result.confidence) || 0}%` }}
                />
              </div>
            </div>
            <div className="result-note">
              <span>ⓘ</span>
              Clinical Notice: This AI output serves as an assistive screening tool and should be verified by a qualified ophthalmologist.
            </div>
          </section>
        )}

        <div className="conditions">
          <span>TARGET RETINAL CONDITIONS</span>
          <div className="condition-list">
            <div><i className="condition-dot primary-accent" /> Cataract</div>
            <div><i className="condition-dot blue" /> Diabetic Retinopathy</div>
            <div><i className="condition-dot purple" /> Glaucoma</div>
            <div><i className="condition-dot green" /> Normal </div>
          </div>
        </div>
      </main>

     
    </div>
  );
}

export default App;