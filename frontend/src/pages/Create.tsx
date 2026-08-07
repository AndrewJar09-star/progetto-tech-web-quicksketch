import React, { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import SignaturePad from 'signature_pad';
import { getRandomWords, createSketch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ApiError } from '../types';

declare global {
  interface Window {
    __qs_submit?: () => void;
  }
}

const PRESET_COLORS = [
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

  const [phase, setPhase] = useState<'word-select' | 'drawing'>('word-select');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const selectedWordRef = useRef<string | null>(null);

  const [words, setWords] = useState<string[]>([]);
  const [wordsLoading, setWordsLoading] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(TIME_LIMIT);

  // Drawing Tools State
  const [activeColor, setActiveColor] = useState<string>('#000000');
  const [customColor, setCustomColor] = useState<string>('#ff0055');
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [activeSize, setActiveSize] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const timerRef = useRef<any>(null);
  const submittedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!loggedIn) {
      showToast('Devi accedere per creare uno sketch', 'error');
      navigate('/auth');
    }
  }, [loggedIn, navigate, showToast]);

  useEffect(() => {
    loadWords();
  }, []);

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
      selectedWordRef.current = null;
    } catch {
      setWords([]);
    } finally {
      setWordsLoading(false);
    }
  }

  const handleSelectWord = (word: string) => {
    setSelectedWord(word);
    selectedWordRef.current = word;
  };

  const startDrawing = useCallback(() => {
    if (!selectedWordRef.current) return;
    setPhase('drawing');
    submittedRef.current = false;

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
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(displayRatio, displayRatio);
      }

      if (padRef.current) {
        padRef.current.off();
      }

      const initialColor = isEraser ? '#ffffff' : activeColor;

      padRef.current = new SignaturePad(canvas, {
        penColor: initialColor,
        minWidth: (SIZES[activeSize]?.value || 4) * 0.5,
        maxWidth: SIZES[activeSize]?.value || 4,
        backgroundColor: '#ffffff'
      });

      padRef.current.clear();

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
  }, [activeColor, activeSize, isEraser, showToast]);

  const submitSketch = useCallback(async () => {
    if (submittedRef.current) return;

    if (!padRef.current || padRef.current.isEmpty()) {
      showToast('Disegna qualcosa prima di pubblicare! 🎨', 'error');
      return;
    }

    const wordToPublish = selectedWordRef.current || selectedWord;
    if (!wordToPublish) {
      showToast('Errore: nessuna parola selezionata', 'error');
      return;
    }

    submittedRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 700;
      exportCanvas.height = 500;
      const exportCtx = exportCanvas.getContext('2d');
      if (exportCtx) {
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, 700, 500);
        exportCtx.drawImage(canvas, 0, 0, 700, 500);
      }

      const imageData = exportCanvas.toDataURL('image/png');
      await createSketch(wordToPublish, imageData, TIME_LIMIT);
      showToast('Sketch pubblicato con successo! 🎉', 'success');
      navigate('/home');
    } catch (err: any) {
      const apiErr = err as ApiError;
      showToast(apiErr.error || 'Errore nella pubblicazione', 'error');
      submittedRef.current = false;
    }
  }, [selectedWord, showToast, navigate]);

  useEffect(() => {
    window.__qs_submit = submitSketch;
    return () => { delete window.__qs_submit; };
  }, [submitSketch]);

  const handleColorClick = (hex: string) => {
    setIsEraser(false);
    setActiveColor(hex);
    if (padRef.current) {
      padRef.current.penColor = hex;
    }
  };

  const handleCustomColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCustomColor(hex);
    setIsEraser(false);
    setActiveColor(hex);
    if (padRef.current) {
      padRef.current.penColor = hex;
    }
  };

  const handleEraserClick = () => {
    setIsEraser(true);
    if (padRef.current) {
      padRef.current.penColor = '#ffffff';
    }
  };

  const handleSizeClick = (idx: number) => {
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
                  onClick={() => handleSelectWord(w)}
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
              {/* Presets & Custom Color Picker */}
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                {PRESET_COLORS.map((c, i) => (
                  <button
                    key={i}
                    className={`color-btn${!isEraser && activeColor === c.hex ? ' active' : ''}`}
                    style={{ background: c.hex }}
                    data-color={c.hex}
                    title={c.name}
                    aria-label={`Colore ${c.name}`}
                    onClick={() => handleColorClick(c.hex)}
                  />
                ))}

                {/* Custom Color Picker Swatch */}
                <div
                  className={`color-picker-btn${!isEraser && !PRESET_COLORS.some(p => p.hex === activeColor) ? ' active' : ''}`}
                  title="Scegli colore personalizzato"
                  style={!PRESET_COLORS.some(p => p.hex === activeColor) ? { background: activeColor } : {}}
                >
                  <span style={{ fontSize: '0.75rem', pointerEvents: 'none' }}>🎨</span>
                  <input
                    type="color"
                    className="color-picker-input"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    title="Tavolozza colori personalizzati"
                  />
                </div>
              </div>

              <div style={{ width: '1px', height: '24px', background: 'var(--ink-faint)', margin: '0 0.25rem' }}></div>

              {/* Eraser Tool */}
              <button
                className={`tool-btn eraser-btn${isEraser ? ' active' : ''}`}
                onClick={handleEraserClick}
                title="Gomma da cancellare (cancella solo il tratto su cui passi)"
              >
                🧹 Gomma
              </button>

              <div style={{ width: '1px', height: '24px', background: 'var(--ink-faint)', margin: '0 0.25rem' }}></div>

              {/* Stroke Sizes */}
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

              {/* Actions */}
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
