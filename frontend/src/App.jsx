import { useState, useRef, useCallback, useEffect } from 'react';
import heic2any from 'heic2any';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const COLD_START_HINT_MS = 5000;
const REQUEST_TIMEOUT_MS = 60000;

function isHeic(file) {
  const name = file.name.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [coldStartHint, setColdStartHint] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const coldStartTimerRef = useRef(null);

  useEffect(() => () => {
    if (coldStartTimerRef.current) clearTimeout(coldStartTimerRef.current);
  }, []);

  const processFile = async (file) => {
    if (!file) return;

    const validType = file.type.startsWith('image/') || isHeic(file);
    if (!validType) {
      setError('Please upload a valid image file (JPG, PNG, WEBP, HEIC, etc.)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`Image is too large (${formatBytes(file.size)}). Please upload an image under 5MB.`);
      return;
    }

    setResult(null);
    setError(null);

    if (isHeic(file)) {
      try {
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
        const convertedFile = new File(
          [blob],
          file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
          { type: 'image/jpeg' },
        );
        if (convertedFile.size > MAX_FILE_SIZE) {
          setError(`Converted image is too large (${formatBytes(convertedFile.size)}). Please try a smaller HEIC photo.`);
          return;
        }
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
    setColdStartHint(false);

    coldStartTimerRef.current = setTimeout(() => setColdStartHint(true), COLD_START_HINT_MS);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed. Please try again.');
      }

      setResult(data);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('The server took too long to respond. Free-tier hosting can be slow on first request — please try again.');
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Cannot reach the server. Make sure the backend is running on port 5001.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      clearTimeout(timeoutId);
      if (coldStartTimerRef.current) clearTimeout(coldStartTimerRef.current);
      setColdStartHint(false);
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
        <h1>Smart Pantry</h1>
        <p className="subtitle">Upload a photo of your meal and get an instant calorie estimate powered by AI</p>
      </header>

      <main className="main">
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
            capture="environment"
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
              <p className="upload-hint">JPG, PNG, WEBP, GIF, HEIC · max 5MB</p>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="file-info">
            <span className="file-name">📎 {selectedFile.name}</span>
            <button className="clear-btn" onClick={handleReset} aria-label="Remove image">✕</button>
          </div>
        )}

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

        {coldStartHint && loading && (
          <div className="hint-card" role="status">
            <span className="hint-icon">⏳</span>
            <p>The server is warming up — this can take ~30 seconds on free hosting. Hang tight.</p>
          </div>
        )}

        {error && (
          <div className="error-card" role="alert">
            <span className="error-icon">⚠️</span>
            <div>
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {result && result.isFood === false && (
          <div className="error-card" role="alert">
            <span className="error-icon">🤔</span>
            <div>
              <strong>That doesn't look like food</strong>
              <p>{result.notes || 'Please upload a photo of a meal to get calorie estimates.'}</p>
            </div>
          </div>
        )}

        {result && result.isFood !== false && (
          <div className="result-card" role="region" aria-label="Calorie analysis results">
            <div className="result-header">
              <span className="result-icon">✅</span>
              <h2>Calorie Analysis</h2>
            </div>
            <div className="result-body">
              <div className="total-calories">
                <span className="total-label">Total estimated</span>
                <span className="total-value">~{Math.round(result.totalCalories || 0)} cal</span>
              </div>

              {Array.isArray(result.items) && result.items.length > 0 && (
                <ul className="items-list">
                  {result.items.map((item, idx) => (
                    <li key={idx} className="item-row">
                      <span className="item-name">{item.name}</span>
                      <span className="item-cal">~{Math.round(item.calories || 0)} cal</span>
                    </li>
                  ))}
                </ul>
              )}

              {result.notes && (
                <p className="result-notes">{result.notes}</p>
              )}
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
