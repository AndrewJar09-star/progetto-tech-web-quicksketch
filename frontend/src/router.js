/**
 * SPA Hash Router per QuickSketch.
 */

const routes = {};
let currentCleanup = null;

/**
 * Registra una route.
 * @param {string} path - Hash path (es: 'home', 'sketch/:id')
 * @param {Function} handler - Funzione(params) che renderizza la pagina. Può restituire una cleanup function.
 */
export function addRoute(path, handler) {
  routes[path] = handler;
}

/**
 * Naviga verso un hash path.
 */
export function navigate(path) {
  window.location.hash = `#/${path}`;
}

/**
 * Parsa la route corrente.
 * @returns {{ route: string, params: object }}
 */
function parseHash() {
  const hash = window.location.hash.slice(2) || 'home'; // rimuovi #/
  const parts = hash.split('/');

  // Cerca match esatto prima
  if (routes[hash]) {
    return { route: hash, params: {} };
  }

  // Cerca match con parametri
  for (const pattern of Object.keys(routes)) {
    const patternParts = pattern.split('/');

    if (patternParts.length !== parts.length) continue;

    const params = {};
    let match = true;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = parts[i];
      } else if (patternParts[i] !== parts[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return { route: pattern, params };
    }
  }

  return { route: '404', params: {} };
}

/**
 * Renderizza la route corrente.
 */
async function handleRoute() {
  // Chiama cleanup della pagina precedente
  if (typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  const { route, params } = parseHash();
  const container = document.getElementById('main-content');

  if (!container) return;

  // Animazione uscita
  container.style.opacity = '0';
  container.style.transform = 'translateY(12px)';

  await new Promise(r => setTimeout(r, 150));

  if (routes[route]) {
    container.innerHTML = '';
    const cleanup = await routes[route](container, params);
    if (typeof cleanup === 'function') {
      currentCleanup = cleanup;
    }
  } else {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>Pagina non trovata</h3>
        <p>La pagina che cerchi non esiste.</p>
        <button class="btn btn-primary" onclick="location.hash='#/home'">Torna alla Home</button>
      </div>
    `;
  }

  // Animazione entrata
  requestAnimationFrame(() => {
    container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
  });

  // Aggiorna link attivo nella navbar
  document.querySelectorAll('.navbar-links a').forEach(a => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active', href === `#/${route}` || href === window.location.hash);
  });

  // Scroll to top
  window.scrollTo(0, 0);
}

/**
 * Inizializza il router.
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('load', handleRoute);

  // Se non c'è hash, imposta home
  if (!window.location.hash) {
    window.location.hash = '#/home';
  } else {
    handleRoute();
  }
}
