/**
 * Pagina Profilo — Statistiche dettagliate dell'utente.
 */
import { getUserStats, isLoggedIn, getCurrentUser } from '../api.js';
import { navigate } from '../router.js';
import { showToast } from '../toast.js';

export async function renderProfile(container) {
  if (!isLoggedIn()) {
    showToast('Accedi per visualizzare il tuo profilo', 'error');
    navigate('auth');
    return;
  }

  const user = getCurrentUser();

  container.innerHTML = `
    <div style="max-width:800px;margin:0 auto">
      <div class="page-header">
        <h1>👤 Il Mio Profilo</h1>
      </div>

      <div class="card text-center" style="margin-bottom:2rem">
        <div class="navbar-avatar" style="width:64px;height:64px;font-size:1.5rem;margin:0 auto 1rem">
          ${user.username.charAt(0).toUpperCase()}
        </div>
        <h2 style="font-size:1.5rem;font-weight:800">${user.username}</h2>
        <p class="text-muted">${user.email}</p>
      </div>

      <div id="stats-content">
        <div class="spinner"></div>
      </div>
    </div>
  `;

  try {
    const { stats } = await getUserStats(user.id);
    renderStats(stats);
  } catch (err) {
    document.getElementById('stats-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3>Statistiche non disponibili</h3>
        <p>${err.error || 'Impossibile caricare le statistiche.'}</p>
      </div>
    `;
  }
}

function renderStats(stats) {
  const content = document.getElementById('stats-content');

  content.innerHTML = `
    <!-- Statistiche come Artista -->
    <h3 class="section-title">🎨 Come Artista</h3>
    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-icon">🖼️</div>
        <div class="stat-value">${stats.total_sketches}</div>
        <div class="stat-label">Sketch Creati</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${stats.sketches_guessed_by_others}</div>
        <div class="stat-label">Indovinati dagli altri</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${stats.total_play_sessions}</div>
        <div class="stat-label">Sessioni di gioco</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-value">${stats.artist_success_rate}%</div>
        <div class="stat-label">Tasso di successo</div>
      </div>
    </div>

    <!-- Statistiche come Giocatore -->
    <h3 class="section-title" style="margin-top:2.5rem">🎯 Come Giocatore</h3>
    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-value">${stats.words_guessed}</div>
        <div class="stat-label">Parole Indovinate</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">❌</div>
        <div class="stat-value">${stats.words_failed}</div>
        <div class="stat-label">Non Indovinate</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-value">${stats.words_in_progress}</div>
        <div class="stat-label">In Corso</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">🔢</div>
        <div class="stat-value">${stats.total_guesses}</div>
        <div class="stat-label">Tentativi Totali</div>
      </div>
    </div>

    <!-- Media tentativi -->
    <div class="card text-center" style="margin-top:1.5rem;padding:2rem">
      <div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem">Media tentativi per indovinare</div>
      <div style="font-size:3rem;font-weight:900;background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
        ${stats.avg_attempts_to_guess || '—'}
      </div>
      <div style="font-size:0.85rem;color:var(--text-muted)">tentativi</div>
    </div>
  `;
}
