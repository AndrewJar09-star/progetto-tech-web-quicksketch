/**
 * API Client per QuickSketch.
 * Gestisce tutte le chiamate HTTP al backend.
 */

const API_BASE = '/api';

/**
 * Recupera i token da localStorage.
 */
function getTokens() {
  return {
    accessToken: localStorage.getItem('qs_access_token'),
    refreshToken: localStorage.getItem('qs_refresh_token')
  };
}

/**
 * Salva i token in localStorage.
 */
export function saveTokens(accessToken, refreshToken) {
  localStorage.setItem('qs_access_token', accessToken);
  localStorage.setItem('qs_refresh_token', refreshToken);
}

/**
 * Rimuove i token da localStorage.
 */
export function clearTokens() {
  localStorage.removeItem('qs_access_token');
  localStorage.removeItem('qs_refresh_token');
  localStorage.removeItem('qs_user');
}

/**
 * Prova a rinnovare il token tramite refresh.
 */
async function refreshAccessToken() {
  const { refreshToken } = getTokens();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!res.ok) return null;

    const data = await res.json();
    saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

/**
 * Fetch wrapper con autenticazione JWT e auto-refresh.
 */
async function apiFetch(endpoint, options = {}) {
  const { accessToken } = getTokens();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  // Se 401, prova refresh
  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });
    }
  }

  const data = await res.json();

  if (!res.ok) {
    throw { status: res.status, ...data };
  }

  return data;
}

// ── Auth API ──────────────────────────────────────────

export async function register(username, email, password) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  });
  saveTokens(data.accessToken, data.refreshToken);
  localStorage.setItem('qs_user', JSON.stringify(data.user));
  return data;
}

export async function login(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  saveTokens(data.accessToken, data.refreshToken);
  localStorage.setItem('qs_user', JSON.stringify(data.user));
  return data;
}

export async function getProfile() {
  return apiFetch('/auth/me');
}

// ── Sketches API ──────────────────────────────────────

export async function getSketches(page = 1, limit = 12, author = null) {
  let url = `/sketches?page=${page}&limit=${limit}`;
  if (author) url += `&author=${encodeURIComponent(author)}`;
  return apiFetch(url);
}

export async function getSketch(id) {
  return apiFetch(`/sketches/${id}`);
}

export async function createSketch(word, imageData, timeLimit = 60) {
  return apiFetch('/sketches', {
    method: 'POST',
    body: JSON.stringify({ word, imageData, timeLimit })
  });
}

export async function submitGuess(sketchId, guess) {
  return apiFetch(`/sketches/${sketchId}/guess`, {
    method: 'POST',
    body: JSON.stringify({ guess })
  });
}

export async function getGuessHistory(sketchId) {
  return apiFetch(`/sketches/${sketchId}/guesses`);
}

// ── Words API ─────────────────────────────────────────

export async function getRandomWords(count = 5) {
  return apiFetch(`/words/random?count=${count}`);
}

// ── Leaderboard API ───────────────────────────────────

export async function getArtistLeaderboard(limit = 10) {
  return apiFetch(`/leaderboard/artists?limit=${limit}`);
}

export async function getGuesserLeaderboard(limit = 10) {
  return apiFetch(`/leaderboard/guessers?limit=${limit}`);
}

// ── User Stats API ────────────────────────────────────

export async function getUserStats(userId) {
  return apiFetch(`/users/${userId}/stats`);
}

// ── Helpers ───────────────────────────────────────────

export function getCurrentUser() {
  try {
    const user = localStorage.getItem('qs_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getTokens().accessToken && !!getCurrentUser();
}
