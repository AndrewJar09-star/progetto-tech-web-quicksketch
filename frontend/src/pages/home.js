/**
 * Pagina Home — Galleria degli sketch + Hero section.
 */
import { getSketches, isLoggedIn } from '../api.js';

export async function renderHome(container) {
  const loggedIn = isLoggedIn();

  container.innerHTML = `
    <section class="hero">
      <h1>Disegna, Indovina,<br><span class="gradient-text">Sfida il Mondo!</span></h1>
      <p>Crea sketch in tempo reale, sfida gli altri a indovinare le tue opere e scala le classifiche di QuickSketch.</p>
      <div class="hero-actions">
        ${loggedIn
          ? `<a href="#/create" class="btn btn-primary btn-lg">✏️ Crea uno Sketch</a>`
          : `<a href="#/auth" class="btn btn-primary btn-lg">🚀 Inizia Ora</a>`
        }
        <a href="#/leaderboard" class="btn btn-secondary btn-lg">🏆 Classifiche</a>
      </div>
    </section>

    <section>
      <h2 class="section-title">🖼️ Ultimi Sketch</h2>
      <div id="sketches-grid" class="grid-sketches">
        <div class="spinner"></div>
      </div>
      <div id="pagination-container" class="pagination"></div>
    </section>
  `;

  await loadSketches(1);
}

async function loadSketches(page) {
  const grid = document.getElementById('sketches-grid');
  const pagination = document.getElementById('pagination-container');
  if (!grid) return;

  grid.innerHTML = '<div class="spinner"></div>';

  try {
    const data = await getSketches(page, 12);
    const { sketches, pagination: pag } = data;

    if (sketches.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🎨</div>
          <h3>Nessuno sketch ancora</h3>
          <p>Sii il primo a creare uno sketch e sfidare gli altri!</p>
          <a href="#/create" class="btn btn-primary">Crea il primo Sketch</a>
        </div>
      `;
      return;
    }

    grid.innerHTML = sketches.map(sketch => renderSketchCard(sketch)).join('');

    // Aggiungi event listeners alle card
    grid.querySelectorAll('.card-sketch').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        location.hash = `#/sketch/${id}`;
      });
    });

    // Pagination
    if (pag.totalPages > 1 && pagination) {
      pagination.innerHTML = renderPagination(pag);
      pagination.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.page);
          if (p && p !== pag.page) loadSketches(p);
        });
      });
    }
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <h3>Errore nel caricamento</h3>
        <p>${err.error || 'Impossibile caricare gli sketch.'}</p>
        <button class="btn btn-secondary" onclick="location.reload()">Riprova</button>
      </div>
    `;
  }
}

function renderSketchCard(sketch) {
  let badge = '';
  if (sketch.is_own) {
    badge = '<span class="sketch-badge badge-own">✏️ Tuo</span>';
  } else if (sketch.user_has_guessed) {
    badge = '<span class="sketch-badge badge-guessed">✅ Indovinato</span>';
  } else if (sketch.user_exhausted) {
    badge = '<span class="sketch-badge badge-failed">❌ Fallito</span>';
  } else if (sketch.user_attempts > 0) {
    badge = `<span class="sketch-badge badge-play">🎯 ${sketch.user_attempts}/10</span>`;
  }

  const date = new Date(sketch.created_at).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'short'
  });

  return `
    <article class="card card-sketch" data-id="${sketch.id}" tabindex="0" role="button" aria-label="Sketch di ${sketch.author_username}">
      <img class="sketch-image" src="${sketch.image_data}" alt="Sketch di ${sketch.author_username}" loading="lazy" />
      <div class="sketch-info">
        <div class="sketch-author">di <strong>${sketch.author_username}</strong> · ${date}</div>
        <div class="sketch-meta">
          <span class="text-muted" style="font-size:0.75rem">👥 ${sketch.total_players} giocatori · ✅ ${sketch.times_guessed} indovinato</span>
          ${badge}
        </div>
      </div>
    </article>
  `;
}

function renderPagination(pag) {
  let html = '';
  html += `<button data-page="${pag.page - 1}" ${pag.page <= 1 ? 'disabled' : ''}>← Prec</button>`;

  for (let i = 1; i <= pag.totalPages; i++) {
    if (pag.totalPages > 7) {
      if (i === 1 || i === pag.totalPages || (i >= pag.page - 1 && i <= pag.page + 1)) {
        html += `<button data-page="${i}" class="${i === pag.page ? 'active' : ''}">${i}</button>`;
      } else if (i === pag.page - 2 || i === pag.page + 2) {
        html += `<button disabled>…</button>`;
      }
    } else {
      html += `<button data-page="${i}" class="${i === pag.page ? 'active' : ''}">${i}</button>`;
    }
  }

  html += `<button data-page="${pag.page + 1}" ${pag.page >= pag.totalPages ? 'disabled' : ''}>Succ →</button>`;
  return html;
}
