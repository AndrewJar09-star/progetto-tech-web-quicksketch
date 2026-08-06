/**
 * Componente Navbar.
 */
import { isLoggedIn, getCurrentUser, clearTokens } from '../api.js';
import { navigate } from '../router.js';

export function renderNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const user = getCurrentUser();
  const loggedIn = isLoggedIn();

  navbar.innerHTML = `
    <div class="navbar">
      <div class="navbar-inner">
        <a class="navbar-brand" href="#/home">
          🎨 <span>QuickSketch</span>
        </a>

        <button class="navbar-toggle" id="nav-toggle" aria-label="Toggle menu">☰</button>

        <ul class="navbar-links" id="nav-links">
          <li><a href="#/home">🏠 Home</a></li>
          <li><a href="#/leaderboard">🏆 Classifiche</a></li>
          ${loggedIn ? `
            <li><a href="#/create" class="nav-btn-create">✏️ Crea Sketch</a></li>
          ` : ''}
        </ul>

        <div class="navbar-user">
          ${loggedIn ? `
            <div class="navbar-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <a class="navbar-username" href="#/profile">${user.username}</a>
            <button class="btn-logout" id="btn-logout">Esci</button>
          ` : `
            <a href="#/auth" class="btn btn-primary btn-sm">Accedi</a>
          `}
        </div>
      </div>
    </div>
  `;

  // Toggle mobile menu
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });

    // Chiudi menu quando si clicca un link
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }

  // Logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearTokens();
      renderNavbar();
      navigate('home');
    });
  }

  // Evidenzia link attivo
  highlightActiveLink();
}

function highlightActiveLink() {
  const hash = window.location.hash || '#/home';
  document.querySelectorAll('.navbar-links a').forEach(a => {
    const href = a.getAttribute('href');
    a.classList.toggle('active', href === hash);
  });
}

// Aggiorna link attivo al cambio di hash
window.addEventListener('hashchange', highlightActiveLink);
