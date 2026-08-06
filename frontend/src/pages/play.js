/**
 * Pagina Play/Sketch — Visualizza sketch e permette di indovinare.
 */
import { getSketch, submitGuess, getGuessHistory, isLoggedIn } from '../api.js';
import { navigate } from '../router.js';
import { showToast } from '../toast.js';

export async function renderPlay(container, params) {
  const sketchId = params.id;

  container.innerHTML = `
    <div class="play-layout">
      <div id="sketch-panel">
        <div class="spinner"></div>
      </div>
      <div id="guess-panel">
        <div class="spinner"></div>
      </div>
    </div>
  `;

  try {
    const { sketch } = await getSketch(sketchId);
    renderSketchPanel(sketch);

    if (isLoggedIn()) {
      await renderGuessPanel(sketch);
    } else {
      document.getElementById('guess-panel').innerHTML = `
        <div class="card text-center">
          <h3>Vuoi provare a indovinare?</h3>
          <p class="text-muted mt-1">Accedi per iniziare a giocare!</p>
          <a href="#/auth" class="btn btn-primary mt-2">Accedi</a>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😕</div>
        <h3>Sketch non trovato</h3>
        <p>Lo sketch potrebbe essere stato rimosso.</p>
        <a href="#/home" class="btn btn-primary">Torna alla Home</a>
      </div>
    `;
  }
}

function renderSketchPanel(sketch) {
  const panel = document.getElementById('sketch-panel');

  const date = new Date(sketch.created_at).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  panel.innerHTML = `
    <div class="card">
      <div style="border-radius:var(--radius-md);overflow:hidden;background:#fff;margin-bottom:1rem">
        <img src="${sketch.image_data}" alt="Sketch" style="width:100%;display:block;object-fit:contain" />
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
        <div>
          <div style="font-weight:700">di <span style="color:var(--accent-cyan)">${sketch.author_username}</span></div>
          <div class="text-muted" style="font-size:0.8rem">${date}</div>
        </div>
        <div style="display:flex;gap:0.75rem;font-size:0.85rem">
          <span>👥 ${sketch.total_players} giocatori</span>
          <span>✅ ${sketch.times_guessed} indovinato</span>
        </div>
      </div>
      ${sketch.word ? `
        <div style="margin-top:1rem;padding:0.75rem;background:rgba(6,214,160,0.1);border-radius:var(--radius-sm);text-align:center">
          <span class="text-muted" style="font-size:0.8rem">La parola era:</span>
          <div style="font-size:1.25rem;font-weight:800;color:var(--accent-cyan)">${sketch.word}</div>
        </div>
      ` : ''}
    </div>
  `;
}

async function renderGuessPanel(sketch) {
  const panel = document.getElementById('guess-panel');

  // Sketch proprio
  if (sketch.is_own) {
    panel.innerHTML = `
      <div class="card text-center">
        <div style="font-size:2.5rem;margin-bottom:0.75rem">✏️</div>
        <h3>Questo è il tuo sketch!</h3>
        <p class="text-muted mt-1">Non puoi indovinare il tuo stesso disegno.</p>
        <div style="margin-top:1.5rem;padding:1rem;background:rgba(168,85,247,0.1);border-radius:var(--radius-sm)">
          <div class="text-muted" style="font-size:0.8rem">Parola scelta:</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--accent-purple)">${sketch.word}</div>
        </div>
        <div class="mt-2" style="font-size:0.85rem">
          👥 ${sketch.total_players} giocatori · ✅ ${sketch.times_guessed} hanno indovinato
        </div>
      </div>
    `;
    return;
  }

  // Già indovinato
  if (sketch.user_has_guessed) {
    const history = await loadHistory(sketch.id);
    panel.innerHTML = `
      <div class="card">
        <div class="text-center" style="margin-bottom:1.5rem">
          <div style="font-size:2.5rem">🎉</div>
          <h3 style="color:var(--accent-cyan)">Hai indovinato!</h3>
          <div style="font-size:1.2rem;font-weight:700;margin-top:0.5rem">${sketch.word}</div>
        </div>
        <h4 style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem">I tuoi tentativi:</h4>
        ${renderGuessHistory(history)}
      </div>
    `;
    return;
  }

  // Tentativi esauriti
  if (sketch.user_exhausted) {
    const history = await loadHistory(sketch.id);
    panel.innerHTML = `
      <div class="card">
        <div class="text-center" style="margin-bottom:1.5rem">
          <div style="font-size:2.5rem">😞</div>
          <h3 style="color:var(--accent-red)">Tentativi esauriti</h3>
          <div style="margin-top:0.5rem">La parola era: <strong style="color:var(--accent-cyan)">${sketch.word}</strong></div>
        </div>
        <h4 style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem">I tuoi tentativi:</h4>
        ${renderGuessHistory(history)}
      </div>
    `;
    return;
  }

  // Pannello di gioco attivo
  const attemptsUsed = sketch.user_attempts || 0;
  const history = attemptsUsed > 0 ? await loadHistory(sketch.id) : [];

  panel.innerHTML = `
    <div class="card">
      <h3 style="margin-bottom:0.5rem">🎯 Indovina la parola!</h3>
      <p class="text-muted" style="font-size:0.85rem;margin-bottom:1rem">
        Tentativi rimasti: <strong style="color:var(--accent-cyan)">${10 - attemptsUsed}</strong> / 10
      </p>

      <form id="guess-form" style="display:flex;gap:0.5rem;margin-bottom:1rem">
        <input class="form-input" type="text" id="guess-input" 
          placeholder="Scrivi la tua risposta..." required autocomplete="off" />
        <button type="submit" class="btn btn-primary" id="guess-submit">Prova</button>
      </form>

      <div id="guess-message"></div>

      <div id="guess-history">
        ${history.length > 0 ? `
          <h4 style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;margin-top:1rem">Tentativi precedenti:</h4>
          ${renderGuessHistory(history)}
        ` : ''}
      </div>
    </div>
  `;

  // Form handler
  const form = document.getElementById('guess-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('guess-input');
    const submitBtn = document.getElementById('guess-submit');
    const messageEl = document.getElementById('guess-message');
    const guess = input.value.trim();

    if (!guess) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
      const result = await submitGuess(sketch.id, guess);

      if (result.is_correct) {
        showToast('🎉 Bravo! Hai indovinato!', 'success');
        // Ricarica la pagina sketch
        const { sketch: updatedSketch } = await getSketch(sketch.id);
        renderSketchPanel(updatedSketch);
        await renderGuessPanel(updatedSketch);
      } else if (result.attempts_remaining <= 0) {
        showToast('😞 Tentativi esauriti!', 'error');
        const { sketch: updatedSketch } = await getSketch(sketch.id);
        renderSketchPanel(updatedSketch);
        await renderGuessPanel(updatedSketch);
      } else {
        // Aggiorna UI
        messageEl.innerHTML = `
          <div class="guess-item wrong" style="margin-bottom:0.5rem">
            <span class="guess-result-icon">❌</span>
            <span>${guess}</span>
            <span style="margin-left:auto;font-size:0.8rem;color:var(--text-muted)">
              ${result.attempts_remaining} tentativi rimasti
            </span>
          </div>
        `;

        // Aggiorna history
        const updatedHistory = await loadHistory(sketch.id);
        const historyEl = document.getElementById('guess-history');
        historyEl.innerHTML = `
          <h4 style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;margin-top:1rem">Tentativi precedenti:</h4>
          ${renderGuessHistory(updatedHistory)}
        `;

        input.value = '';
        input.focus();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Prova';
      }
    } catch (err) {
      showToast(err.error || 'Errore nell\'invio del tentativo', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Prova';
    }
  });
}

async function loadHistory(sketchId) {
  try {
    const { guesses } = await getGuessHistory(sketchId);
    return guesses;
  } catch {
    return [];
  }
}

function renderGuessHistory(guesses) {
  if (!guesses || guesses.length === 0) return '';

  return `
    <ul class="guess-list">
      ${guesses.map(g => `
        <li class="guess-item ${g.is_correct ? 'correct' : 'wrong'}">
          <span class="guess-number">#${g.attempt_number}</span>
          <span>${g.guess_text}</span>
          <span class="guess-result-icon" style="margin-left:auto">${g.is_correct ? '✅' : '❌'}</span>
        </li>
      `).join('')}
    </ul>
  `;
}
