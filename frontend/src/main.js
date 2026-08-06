/**
 * QuickSketch — Main Entry Point.
 * Configura il router, renderizza la navbar e avvia la SPA.
 */
import './style.css';
import { addRoute, initRouter } from './router.js';
import { renderNavbar } from './components/navbar.js';
import { renderHome } from './pages/home.js';
import { renderAuth } from './pages/auth.js';
import { renderCreate } from './pages/create.js';
import { renderPlay } from './pages/play.js';
import { renderLeaderboard } from './pages/leaderboard.js';
import { renderProfile } from './pages/profile.js';

// ── Registra le routes ──────────────────────────────
addRoute('home', renderHome);
addRoute('auth', renderAuth);
addRoute('create', renderCreate);
addRoute('sketch/:id', renderPlay);
addRoute('leaderboard', renderLeaderboard);
addRoute('profile', renderProfile);

// ── Renderizza la navbar ────────────────────────────
renderNavbar();

// Aggiorna la navbar ad ogni navigazione
window.addEventListener('hashchange', () => {
  renderNavbar();
});

// ── Avvia il router ─────────────────────────────────
initRouter();
