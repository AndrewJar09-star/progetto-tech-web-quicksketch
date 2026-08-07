import {
  User,
  Sketch,
  Guess,
  Pagination,
  ArtistLeaderboardItem,
  GuesserLeaderboardItem,
  UserStats,
  ApiError
} from './types';

const API_BASE = '/api';

function getTokens() {
  return {
    accessToken: localStorage.getItem('qs_access_token'),
    refreshToken: localStorage.getItem('qs_refresh_token')
  };
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('qs_access_token', accessToken);
  localStorage.setItem('qs_refresh_token', refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem('qs_access_token');
  localStorage.removeItem('qs_refresh_token');
  localStorage.removeItem('qs_user');
}

async function refreshAccessToken(): Promise<string | null> {
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

async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = getTokens();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

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
    const err: ApiError = { status: res.status, ...data };
    throw err;
  }

  return data as T;
}

// ── Auth API ──────────────────────────────────────────

export async function register(username: string, email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const data = await apiFetch<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  });
  saveTokens(data.accessToken, data.refreshToken);
  localStorage.setItem('qs_user', JSON.stringify(data.user));
  return data;
}

export async function login(username: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const data = await apiFetch<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  saveTokens(data.accessToken, data.refreshToken);
  localStorage.setItem('qs_user', JSON.stringify(data.user));
  return data;
}

export async function getProfile(): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/auth/me');
}

export async function updateAvatar(avatarUrl: string | null): Promise<{ user: User; message: string }> {
  const data = await apiFetch<{ user: User; message: string }>('/auth/avatar', {
    method: 'PUT',
    body: JSON.stringify({ avatarUrl })
  });
  if (data.user) {
    localStorage.setItem('qs_user', JSON.stringify(data.user));
  }
  return data;
}

// ── Sketches API ──────────────────────────────────────

export async function getSketches(
  page: number = 1,
  limit: number = 12,
  author: string | null = null
): Promise<{ sketches: Sketch[]; pagination: Pagination }> {
  let url = `/sketches?page=${page}&limit=${limit}`;
  if (author) url += `&author=${encodeURIComponent(author)}`;
  return apiFetch<{ sketches: Sketch[]; pagination: Pagination }>(url);
}

export async function getSketch(id: string | number): Promise<{ sketch: Sketch }> {
  return apiFetch<{ sketch: Sketch }>(`/sketches/${id}`);
}

export async function createSketch(word: string, imageData: string, timeLimit: number = 60): Promise<{ sketch: Sketch; message: string }> {
  return apiFetch<{ sketch: Sketch; message: string }>('/sketches', {
    method: 'POST',
    body: JSON.stringify({ word, imageData, timeLimit })
  });
}

export async function deleteSketch(id: string | number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/sketches/${id}`, {
    method: 'DELETE'
  });
}

export async function submitGuess(
  sketchId: string | number,
  guess: string
): Promise<{ is_correct: boolean; message?: string; attempt_number: number; attempts_remaining: number }> {
  return apiFetch<{ is_correct: boolean; message?: string; attempt_number: number; attempts_remaining: number }>(`/sketches/${sketchId}/guess`, {
    method: 'POST',
    body: JSON.stringify({ guess })
  });
}

export async function getGuessHistory(sketchId: string | number): Promise<{ guesses: Guess[] }> {
  return apiFetch<{ guesses: Guess[] }>(`/sketches/${sketchId}/guesses`);
}

// ── Words API ─────────────────────────────────────────

export async function getRandomWords(count: number = 5): Promise<{ words: string[] }> {
  return apiFetch<{ words: string[] }>(`/words/random?count=${count}`);
}

// ── Leaderboard API ───────────────────────────────────

export async function getArtistLeaderboard(limit: number = 10): Promise<{ leaderboard: ArtistLeaderboardItem[] }> {
  return apiFetch<{ leaderboard: ArtistLeaderboardItem[] }>(`/leaderboard/artists?limit=${limit}`);
}

export async function getGuesserLeaderboard(limit: number = 10): Promise<{ leaderboard: GuesserLeaderboardItem[] }> {
  return apiFetch<{ leaderboard: GuesserLeaderboardItem[] }>(`/leaderboard/guessers?limit=${limit}`);
}

// ── User Stats API ────────────────────────────────────

export async function getUserStats(userId: number | string): Promise<{ stats: UserStats }> {
  return apiFetch<{ stats: UserStats }>(`/users/${userId}/stats`);
}

// ── Helpers ───────────────────────────────────────────

export function getCurrentUser(): User | null {
  try {
    const user = localStorage.getItem('qs_user');
    return user ? (JSON.parse(user) as User) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getTokens().accessToken && !!getCurrentUser();
}
