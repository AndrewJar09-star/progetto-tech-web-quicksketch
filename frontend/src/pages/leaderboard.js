/**
 * Pagina Classifiche — Top Artisti e Top Giocatori.
 */
import { getArtistLeaderboard, getGuesserLeaderboard } from '../api.js';

export async function renderLeaderboard(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>🏆 Classifiche</h1>
      <p>I migliori disegnatori e giocatori di QuickSketch</p>
    </div>

    <div class="leaderboard-tabs">
      <button class="leaderboard-tab active" id="tab-artists">🎨 Artisti</button>
      <button class="leaderboard-tab" id="tab-guessers">🎯 Giocatori</button>
    </div>

    <div id="leaderboard-content">
      <div class="spinner"></div>
    </div>
  `;

  // Tab switching
  document.getElementById('tab-artists').addEventListener('click', () => {
    document.getElementById('tab-artists').classList.add('active');
    document.getElementById('tab-guessers').classList.remove('active');
    loadArtists();
  });

  document.getElementById('tab-guessers').addEventListener('click', () => {
    document.getElementById('tab-guessers').classList.add('active');
    document.getElementById('tab-artists').classList.remove('active');
    loadGuessers();
  });

  await loadArtists();
}

async function loadArtists() {
  const content = document.getElementById('leaderboard-content');
  content.innerHTML = '<div class="spinner"></div>';

  try {
    const { leaderboard } = await getArtistLeaderboard(20);

    if (leaderboard.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎨</div>
          <h3>Nessun artista ancora</h3>
          <p>Crea il tuo primo sketch per apparire in classifica!</p>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="card" style="overflow-x:auto">
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Artista</th>
              <th>Sketch</th>
              <th>Indovinati</th>
              <th>% Successo</th>
            </tr>
          </thead>
          <tbody>
            ${leaderboard.map((artist, i) => `
              <tr>
                <td><span class="rank-badge ${i < 3 ? `rank-${i + 1}` : 'rank-other'}">${i + 1}</span></td>
                <td style="font-weight:600">${artist.username}</td>
                <td>${artist.total_sketches}</td>
                <td>${artist.total_correct_guesses}</td>
                <td>
                  <span style="color:var(--accent-cyan);font-weight:700">${artist.guess_rate}%</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Errore nel caricamento</h3>
        <p>Impossibile caricare la classifica.</p>
      </div>
    `;
  }
}

async function loadGuessers() {
  const content = document.getElementById('leaderboard-content');
  content.innerHTML = '<div class="spinner"></div>';

  try {
    const { leaderboard } = await getGuesserLeaderboard(20);

    if (leaderboard.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎯</div>
          <h3>Nessun giocatore ancora</h3>
          <p>Prova a indovinare uno sketch per apparire in classifica!</p>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="card" style="overflow-x:auto">
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Giocatore</th>
              <th>Parole Indovinate</th>
              <th>Sketch Tentati</th>
              <th>Media Tentativi</th>
            </tr>
          </thead>
          <tbody>
            ${leaderboard.map((guesser, i) => `
              <tr>
                <td><span class="rank-badge ${i < 3 ? `rank-${i + 1}` : 'rank-other'}">${i + 1}</span></td>
                <td style="font-weight:600">${guesser.username}</td>
                <td style="color:var(--accent-cyan);font-weight:700">${guesser.words_guessed}</td>
                <td>${guesser.sketches_attempted}</td>
                <td>${guesser.avg_attempts}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Errore nel caricamento</h3>
        <p>Impossibile caricare la classifica.</p>
      </div>
    `;
  }
}
