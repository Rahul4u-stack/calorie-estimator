import { useState, useRef, useCallback } from 'react';
import heic2any from 'heic2any';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function isHeic(file) {
  const name = file.name.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;

    const validType = file.type.startsWith('image/') || isHeic(file);
    if (!validType) {
      setError('Please upload a valid image file (JPG, PNG, WEBP, HEIC, etc.)');
      return;
    }

    setResult(null);
    setError(null);

    if (isHeic(file)) {
      try {
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
        const convertedFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), { type: 'image/jpeg' });
        setSelectedFile(convertedFile);
        setImagePreview(URL.createObjectURL(blob));
      } catch {
        setError('Could not process HEIC image. Please try a JPG or PNG instead.');
      }
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed. Please try again.');
      }

      setResult(data.result);
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Cannot reach the server. Make sure the backend is running on port 5001.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-icon">🥗</div>
        <h1>Calorie Estimator</h1>
        <p className="subtitle">Upload a photo of your meal and get an instant calorie estimate powered by AI</p>
      </header>

      <main className="main">
        {/* Upload Area */}
        <div
          className={`upload-area ${dragOver ? 'drag-over' : ''} ${imagePreview ? 'has-image' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !imagePreview && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && !imagePreview && fileInputRef.current?.click()}
          aria-label="Upload food image"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file-input"
            aria-hidden="true"
          />

          {imagePreview ? (
            <div className="preview-container">
              <img src={imagePreview} alt="Food preview" className="preview-image" />
              <div className="preview-overlay">
                <button
                  className="change-btn"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Change Image
                </button>
              </div>
            </div>
          ) : (
            <div className="upload-placeholder">
              <div className="upload-icon">📷</div>
              <p className="upload-primary">Drag &amp; drop your food photo here</p>
              <p className="upload-secondary">or <span className="upload-link">click to browse</span></p>
              <p className="upload-hint">Supports JPG, PNG, WEBP, GIF, HEIC</p>
            </div>
          )}
        </div>

        {/* File name display */}
        {selectedFile && (
          <div className="file-info">
            <span className="file-name">📎 {selectedFile.name}</span>
            <button className="clear-btn" onClick={handleReset} aria-label="Remove image">✕</button>
          </div>
        )}

        {/* Analyze Button */}
        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={!selectedFile || loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              Analyzing...
            </>
          ) : (
            <>
              <span aria-hidden="true">🔍</span>
              Analyze Calories
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="error-card" role="alert">
            <span className="error-icon">⚠️</span>
            <div>
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="result-card" role="region" aria-label="Calorie analysis results">
            <div className="result-header">
              <span className="result-icon">✅</span>
              <h2>Calorie Analysis</h2>
            </div>
            <div className="result-body">
              <pre className="result-text">{result}</pre>
            </div>
            <button className="analyze-again-btn" onClick={handleReset}>
              Analyze Another Meal
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Results are estimates only. Consult a nutritionist for precise dietary advice.</p>
      </footer>
    </div>
  );
}
