/**
 * Pagina Crea Sketch — Scelta parola + Canvas con timer.
 */
import SignaturePad from 'signature_pad';
import { getRandomWords, createSketch, isLoggedIn } from '../api.js';
import { navigate } from '../router.js';
import { showToast } from '../toast.js';

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

export async function renderCreate(container) {
  if (!isLoggedIn()) {
    showToast('Devi accedere per creare uno sketch', 'error');
    navigate('auth');
    return;
  }

  // Stato
  let selectedWord = null;
  let phase = 'word-select'; // 'word-select' | 'drawing' | 'submitted'
  let timer = null;
  let timeLeft = TIME_LIMIT;
  let signaturePad = null;

  container.innerHTML = `
    <div class="create-layout">
      <div class="page-header">
        <h1>✏️ Crea uno Sketch</h1>
        <p>Scegli una parola e disegnala prima che scada il tempo!</p>
      </div>

      <!-- Step 1: Word Selection -->
      <div id="step-word" class="card">
        <h3 class="text-center mb-2">Scegli la parola da disegnare</h3>
        <div id="words-container" class="word-selector">
          <div class="spinner"></div>
        </div>
        <div class="text-center mt-2">
          <button class="btn btn-secondary btn-sm" id="btn-refresh-words">🔄 Altre parole</button>
        </div>
        <div class="text-center mt-3">
          <button class="btn btn-primary btn-lg" id="btn-start-drawing" disabled>
            🎨 Inizia a Disegnare
          </button>
        </div>
      </div>

      <!-- Step 2: Drawing (hidden) -->
      <div id="step-draw" style="display:none">
        <div class="timer-display">
          <div class="timer-circle">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle class="timer-bg" cx="40" cy="40" r="36" />
              <circle class="timer-progress" id="timer-progress" cx="40" cy="40" r="36"
                stroke-dasharray="226.19"
                stroke-dashoffset="0" />
            </svg>
            <div class="timer-text" id="timer-text">${TIME_LIMIT}</div>
          </div>
          <div>
            <div style="font-weight:700;font-size:1.1rem" id="selected-word-display"></div>
            <div class="text-muted" style="font-size:0.85rem">Disegna questa parola!</div>
          </div>
        </div>

        <div class="canvas-wrapper">
          <canvas id="draw-canvas" width="700" height="500"></canvas>
          <div class="canvas-toolbar">
            <div style="display:flex;gap:0.35rem;align-items:center">
              ${COLORS.map((c, i) => `
                <button class="color-btn ${i === 0 ? 'active' : ''}" style="background:${c.hex}" 
                  data-color="${c.hex}" title="${c.name}" aria-label="Colore ${c.name}"></button>
              `).join('')}
            </div>
            <div style="width:1px;height:24px;background:var(--border-subtle);margin:0 0.25rem"></div>
            <div style="display:flex;gap:0.35rem">
              ${SIZES.map((s, i) => `
                <button class="size-btn ${i === 1 ? 'active' : ''}" data-size="${s.value}">${s.name}</button>
              `).join('')}
            </div>
            <div style="margin-left:auto;display:flex;gap:0.35rem">
              <button class="btn btn-sm btn-secondary" id="btn-undo">↩ Annulla</button>
              <button class="btn btn-sm btn-danger" id="btn-clear">🗑 Pulisci</button>
            </div>
          </div>
        </div>

        <div class="text-center mt-3" style="display:flex;gap:1rem;justify-content:center">
          <button class="btn btn-primary btn-lg" id="btn-submit-sketch">
            🚀 Pubblica Sketch
          </button>
        </div>
      </div>
    </div>
  `;

  // Carica parole
  await loadWords();

  // Event handlers
  document.getElementById('btn-refresh-words').addEventListener('click', loadWords);

  document.getElementById('btn-start-drawing').addEventListener('click', () => {
    if (!selectedWord) return;
    startDrawingPhase();
  });

  async function loadWords() {
    const wordsContainer = document.getElementById('words-container');
    wordsContainer.innerHTML = '<div class="spinner"></div>';

    try {
      const { words } = await getRandomWords(5);
      wordsContainer.innerHTML = words.map(w =>
        `<button class="word-option" data-word="${w}">${w}</button>`
      ).join('');

      // Word selection
      wordsContainer.querySelectorAll('.word-option').forEach(btn => {
        btn.addEventListener('click', () => {
          wordsContainer.querySelectorAll('.word-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedWord = btn.dataset.word;
          document.getElementById('btn-start-drawing').disabled = false;
        });
      });

      selectedWord = null;
      document.getElementById('btn-start-drawing').disabled = true;
    } catch (err) {
      wordsContainer.innerHTML = '<p class="text-muted">Errore nel caricamento delle parole. Riprova.</p>';
    }
  }

  function startDrawingPhase() {
    phase = 'drawing';
    document.getElementById('step-word').style.display = 'none';
    document.getElementById('step-draw').style.display = 'block';
    document.getElementById('selected-word-display').textContent = selectedWord;

    // Init canvas
    const canvas = document.getElementById('draw-canvas');
    
    // Responsive canvas
    const wrapper = canvas.parentElement;
    const wrapperWidth = wrapper.clientWidth;
    const ratio = Math.min(wrapperWidth / 700, 1);
    canvas.style.width = '100%';
    canvas.style.height = `${500 * ratio}px`;

    signaturePad = new SignaturePad(canvas, {
      penColor: '#000000',
      minWidth: 2,
      maxWidth: 4,
      backgroundColor: 'rgb(255, 255, 255)'
    });

    // Resize handling
    function resizeCanvas() {
      const w = wrapper.clientWidth;
      const displayRatio = window.devicePixelRatio || 1;
      canvas.width = w * displayRatio;
      canvas.height = (500 * (w / 700)) * displayRatio;
      canvas.style.width = w + 'px';
      canvas.style.height = (500 * (w / 700)) + 'px';
      const ctx = canvas.getContext('2d');
      ctx.scale(displayRatio, displayRatio);
      signaturePad.clear();
      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    resizeCanvas();

    // Color buttons
    container.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        signaturePad.penColor = btn.dataset.color;
      });
    });

    // Size buttons
    container.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const size = parseInt(btn.dataset.size);
        signaturePad.minWidth = size * 0.5;
        signaturePad.maxWidth = size;
      });
    });

    // Undo
    document.getElementById('btn-undo').addEventListener('click', () => {
      const data = signaturePad.toData();
      if (data.length > 0) {
        data.pop();
        signaturePad.fromData(data);
      }
    });

    // Clear
    document.getElementById('btn-clear').addEventListener('click', () => {
      signaturePad.clear();
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    // Submit
    document.getElementById('btn-submit-sketch').addEventListener('click', submitSketch);

    // Start timer
    startTimer();
  }

  function startTimer() {
    timeLeft = TIME_LIMIT;
    const circumference = 2 * Math.PI * 36; // r=36
    const progress = document.getElementById('timer-progress');
    const text = document.getElementById('timer-text');

    timer = setInterval(() => {
      timeLeft--;
      text.textContent = timeLeft;

      // Aggiorna cerchio
      const offset = circumference * (1 - timeLeft / TIME_LIMIT);
      progress.style.strokeDashoffset = offset;

      // Colori di avviso
      progress.classList.remove('warning', 'danger');
      if (timeLeft <= 10) {
        progress.classList.add('danger');
      } else if (timeLeft <= 20) {
        progress.classList.add('warning');
      }

      if (timeLeft <= 0) {
        clearInterval(timer);
        submitSketch();
      }
    }, 1000);
  }

  async function submitSketch() {
    if (phase === 'submitted') return;
    phase = 'submitted';

    if (timer) clearInterval(timer);

    const submitBtn = document.getElementById('btn-submit-sketch');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Pubblicazione...';
    }

    try {
      const canvas = document.getElementById('draw-canvas');
      const imageData = canvas.toDataURL('image/png');

      await createSketch(selectedWord, imageData, TIME_LIMIT);
      showToast('Sketch pubblicato con successo! 🎉', 'success');
      navigate('home');
    } catch (err) {
      showToast(err.error || 'Errore nella pubblicazione', 'error');
      phase = 'drawing';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Pubblica Sketch';
      }
    }
  }

  // Cleanup function
  return () => {
    if (timer) clearInterval(timer);
  };
}
