import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SignaturePad from 'signature_pad';
import { getRandomWords, createSketch } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

const COLORS = [
  { name: 'Nero', hex: '#000000' },
  { name: 'Rosso', hex: '#ef4444' },
  { name: 'Blu', hex: '#3b82f6' },
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Arancio', hex: '#f59e0b' },
  { name: 'Viola', hex: '#a855f7' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Marrone', hex: '#92400e' },
];

const SIZES = [
  { name: 'S', value: 2 },
  { name: 'M', value: 4 },
  { name: 'L', value: 8 },
  { name: 'XL', value: 14 },
];

const TIME_LIMIT = 60;

export default function Create() {
  const { loggedIn } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [phase, setPhase] = useState('word-select');
  const [selectedWord, setSelectedWord] = useState(null);
  const [words, setWords] = useState([]);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [activeColor, setActiveColor] = useState(0);
  const [activeSize, setActiveSize] = useState(1);

  const canvasRef = useRef(null);
  const padRef = useRef(null);
  const timerRef = useRef(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!loggedIn) {
      showToast('Devi accedere per creare uno sketch', 'error');
      navigate('/auth');
    }
  }, [loggedIn, navigate, showToast]);

  useEffect(() => {
    loadWords();
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function loadWords() {
    setWordsLoading(true);
    try {
      const { words: w } = await getRandomWords(5);
      setWords(w);
      setSelectedWord(null);
    } catch {
      setWords([]);
    } finally {
      setWordsLoading(false);
    }
  }

  const startDrawing = useCallback(() => {
    setPhase('drawing');
    submittedRef.current = false;

    // Init canvas after state update
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const wrapper = canvas.parentElement;
      const w = wrapper ? wrapper.clientWidth : 700;
      const h = Math.round(500 * (w / 700));
      const displayRatio = Math.max(window.devicePixelRatio || 1, 1);

      canvas.width = w * displayRatio;
      canvas.height = h * displayRatio;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(displayRatio, displayRatio);

      if (padRef.current) {
        padRef.current.off();
      }

      padRef.current = new SignaturePad(canvas, {
        penColor: COLORS[activeColor]?.hex || '#000000',
        minWidth: SIZES[activeSize]?.value * 0.5 || 2,
        maxWidth: SIZES[activeSize]?.value || 4,
        backgroundColor: '#ffffff'
      });

      padRef.current.clear();

      // Start timer
      setTimeLeft(TIME_LIMIT);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            if (padRef.current && !padRef.current.isEmpty()) {
              submitSketch();
            } else {
              showToast('Tempo scaduto! Disegna qualcosa prima di pubblicare.', 'error');
              setPhase('word-select');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 50);
  }, [activeColor, activeSize, showToast]);

  const submitSketch = useCallback(async () => {
    if (submittedRef.current) return;

    if (!padRef.current || padRef.current.isEmpty()) {
      showToast('Disegna qualcosa prima di pubblicare! 🎨', 'error');
      return;
    }

    submittedRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Export canvas at standard 700x500 resolution
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 700;
      exportCanvas.height = 500;
      const exportCtx = exportCanvas.getContext('2d');
      exportCtx.fillStyle = '#ffffff';
      exportCtx.fillRect(0, 0, 700, 500);
      exportCtx.drawImage(canvas, 0, 0, 700, 500);

      const imageData = exportCanvas.toDataURL('image/png');
      await createSketch(selectedWord, imageData, TIME_LIMIT);
      showToast('Sketch pubblicato con successo! 🎉', 'success');
      navigate('/home');
    } catch (err) {
      showToast(err.error || 'Errore nella pubblicazione', 'error');
      submittedRef.current = false;
    }
  }, [selectedWord, showToast, navigate]);

  // Make submitSketch available in timer callback
  useEffect(() => {
    window.__qs_submit = submitSketch;
    return () => { delete window.__qs_submit; };
  }, [submitSketch]);

  const handleColorClick = (idx) => {
    setActiveColor(idx);
    if (padRef.current) padRef.current.penColor = COLORS[idx].hex;
  };

  const handleSizeClick = (idx) => {
    setActiveSize(idx);
    if (padRef.current) {
      padRef.current.minWidth = SIZES[idx].value * 0.5;
      padRef.current.maxWidth = SIZES[idx].value;
    }
  };

  const handleUndo = () => {
    if (!padRef.current) return;
    const data = padRef.current.toData();
    if (data.length > 0) {
      data.pop();
      padRef.current.fromData(data);
    }
  };

  const handleClear = () => {
    if (!padRef.current) return;
    padRef.current.clear();
  };

  const circumference = 2 * Math.PI * 36;
  const timerOffset = circumference * (1 - timeLeft / TIME_LIMIT);
  const timerClass = timeLeft <= 10 ? 'danger' : timeLeft <= 20 ? 'warning' : '';

  if (!loggedIn) return null;

  return (
    <div className="create-layout">
      <div className="page-header">
        <h1>✏️ Crea uno Sketch</h1>
        <p>Scegli una parola e disegnala prima che scada il tempo!</p>
      </div>

      {/* Step 1: Word Selection */}
      {phase === 'word-select' && (
        <div id="step-word" className="card">
          <h3 className="text-center mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Scegli la parola da disegnare
          </h3>
          <div id="words-container" className="word-selector">
            {wordsLoading ? (
              <div className="spinner"></div>
            ) : (
              words.map((w, i) => (
                <button
                  key={i}
                  className={`word-option${selectedWord === w ? ' selected' : ''}`}
                  data-word={w}
                  onClick={() => setSelectedWord(w)}
                >
                  {w}
                </button>
              ))
            )}
          </div>
          <div className="text-center mt-2">
            <button className="btn btn-secondary btn-sm" id="btn-refresh-words" onClick={loadWords}>
              🔄 Altre parole
            </button>
          </div>
          <div className="text-center mt-3">
            <button
              className="btn btn-primary btn-lg"
              id="btn-start-drawing"
              disabled={!selectedWord}
              onClick={startDrawing}
            >
              🎨 Inizia a Disegnare
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Drawing */}
      {phase === 'drawing' && (
        <div id="step-draw">
          <div className="timer-display">
            <div className="timer-circle">
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle className="timer-bg" cx="45" cy="45" r="36" />
                <circle
                  className={`timer-progress${timerClass ? ` ${timerClass}` : ''}`}
                  id="timer-progress"
                  cx="45" cy="45" r="36"
                  strokeDasharray={circumference}
                  strokeDashoffset={timerOffset}
                />
              </svg>
              <div className={`timer-text${timerClass ? ` ${timerClass}` : ''}`} id="timer-text">
                {timeLeft}
              </div>
            </div>
            <div>
              <div
                id="selected-word-display"
                style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}
              >
                {selectedWord}
              </div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>Disegna questa parola!</div>
            </div>
          </div>

          <div className="canvas-wrapper">
            <canvas id="draw-canvas" ref={canvasRef} width="700" height="500"></canvas>
            <div className="canvas-toolbar">
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                {COLORS.map((c, i) => (
                  <button
                    key={i}
                    className={`color-btn${activeColor === i ? ' active' : ''}`}
                    style={{ background: c.hex }}
                    data-color={c.hex}
                    title={c.name}
                    aria-label={`Colore ${c.name}`}
                    onClick={() => handleColorClick(i)}
                  />
                ))}
              </div>
              <div style={{ width: '1px', height: '24px', background: 'var(--ink-faint)', margin: '0 0.25rem' }}></div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {SIZES.map((s, i) => (
                  <button
                    key={i}
                    className={`size-btn${activeSize === i ? ' active' : ''}`}
                    data-size={s.value}
                    onClick={() => handleSizeClick(i)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem' }}>
                <button className="btn btn-sm btn-secondary" id="btn-undo" onClick={handleUndo}>
                  ↩ Annulla
                </button>
                <button className="btn btn-sm btn-danger" id="btn-clear" onClick={handleClear}>
                  🗑 Pulisci
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-3" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              className="btn btn-primary btn-lg"
              id="btn-submit-sketch"
              onClick={submitSketch}
            >
              🚀 Pubblica Sketch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
