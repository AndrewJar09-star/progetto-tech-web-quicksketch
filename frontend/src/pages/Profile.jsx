import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserStats, updateAvatar } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

const EMOJI_AVATARS = [
  '🎨', '🤖', '🦊', '🐱‍🚀', '🚀', '🎭', '👑', '🦄', '🐲', '👾', '🎮', '⚡', '🧙‍♂️', '🦸‍♀️', '🐱', '🐼', '🦁', '🍕'
];

function emojiToSvgDataUrl(emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23FFE156"/><text x="50" y="65" font-size="50" text-anchor="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}

export default function Profile() {
  const { user, loggedIn, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => {
    if (!loggedIn) {
      showToast('Accedi per visualizzare il tuo profilo', 'error');
      navigate('/auth');
      return;
    }

    if (user?.id) {
      loadStats(user.id);
    }
  }, [loggedIn, user, navigate, showToast]);

  async function loadStats(userId) {
    setLoading(true);
    try {
      const { stats: s } = await getUserStats(userId);
      setStats(s);
    } catch (err) {
      setError(err.error || 'Impossibile caricare le statistiche.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAvatar(url) {
    setSavingAvatar(true);
    try {
      await updateAvatar(url);
      refreshAuth();
      showToast('Avatar aggiornato con successo! 🎉', 'success');
      setShowAvatarModal(false);
    } catch (err) {
      showToast(err.error || 'Errore nell\'aggiornamento dell\'avatar', 'error');
    } finally {
      setSavingAvatar(false);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('L\'immagine deve essere inferiore a 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result;
      if (base64) {
        await handleSaveAvatar(base64);
      }
    };
    reader.readAsDataURL(file);
  }

  if (!loggedIn || !user) return null;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <h1>👤 Il Mio Profilo</h1>
      </div>

      <div className="card text-center" style={{ marginBottom: '2rem' }}>
        <div
          className="navbar-avatar"
          style={{ width: '80px', height: '80px', fontSize: '2.2rem', margin: '0 auto 1rem', overflow: 'hidden', border: '3px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)' }}
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            user.username.charAt(0).toUpperCase()
          )}
        </div>

        <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>{user.username}</h2>
        <p className="text-muted" style={{ marginBottom: '1rem' }}>{user.email}</p>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowAvatarModal(!showAvatarModal)}
        >
          🖼️ Personalizza Avatar
        </button>

        {/* Modal / Section Personalizzazione Avatar */}
        {showAvatarModal && (
          <div className="card" style={{ marginTop: '1.5rem', textAlign: 'left', background: 'var(--bg-paper-alt)', border: '2px dashed var(--ink)' }}>
            <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>Scegli il tuo Avatar:</h4>

            {/* Presets Emoji */}
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--ink-muted)' }}>
              Scegli un Avatar rapido:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {EMOJI_AVATARS.map((emoji, idx) => (
                <button
                  key={idx}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '1.4rem', padding: '0.4rem 0.6rem' }}
                  disabled={savingAvatar}
                  onClick={() => handleSaveAvatar(emojiToSvgDataUrl(emoji))}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Carica File */}
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--ink-muted)' }}>
              Oppure carica una tua foto dal dispositivo:
            </div>
            <input
              type="file"
              accept="image/*"
              className="form-input"
              style={{ marginBottom: '1rem', padding: '0.5rem' }}
              disabled={savingAvatar}
              onChange={handleFileUpload}
            />

            {/* Inserisci URL */}
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--ink-muted)' }}>
              Oppure incolla l'URL di un'immagine:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="url"
                className="form-input"
                placeholder="https://esempio.com/foto.jpg"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                disabled={savingAvatar}
              />
              <button
                className="btn btn-primary btn-sm"
                disabled={!customUrl.trim() || savingAvatar}
                onClick={() => handleSaveAvatar(customUrl.trim())}
              >
                Salva
              </button>
            </div>

            {user.avatar_url && (
              <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                <button
                  className="btn btn-sm btn-danger"
                  disabled={savingAvatar}
                  onClick={() => handleSaveAvatar(null)}
                >
                  🗑 Rimuovi Avatar (Usa Iniziale)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div id="stats-content">
        {loading ? (
          <div className="spinner"></div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h3>Statistiche non disponibili</h3>
            <p>{error}</p>
          </div>
        ) : (
          stats && <StatsDisplay stats={stats} />
        )}
      </div>
    </div>
  );
}

function StatsDisplay({ stats }) {
  return (
    <>
      {/* Statistiche come Artista */}
      <h3 className="section-title">🎨 Come Artista</h3>
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon">🖼️</div>
          <div className="stat-value">{stats.total_sketches}</div>
          <div className="stat-label">Sketch Creati</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.sketches_guessed_by_others}</div>
          <div className="stat-label">Indovinati dagli altri</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.total_play_sessions}</div>
          <div className="stat-label">Sessioni di gioco</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-value">{stats.artist_success_rate}%</div>
          <div className="stat-label">Tasso di successo</div>
        </div>
      </div>

      {/* Statistiche come Giocatore */}
      <h3 className="section-title" style={{ marginTop: '2.5rem' }}>🎯 Come Giocatore</h3>
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-value">{stats.words_guessed}</div>
          <div className="stat-label">Parole Indovinate</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-value">{stats.words_failed}</div>
          <div className="stat-label">Non Indovinate</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{stats.words_in_progress}</div>
          <div className="stat-label">In Corso</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">🔢</div>
          <div className="stat-value">{stats.total_guesses}</div>
          <div className="stat-label">Tentativi Totali</div>
        </div>
      </div>

      {/* Media tentativi */}
      <div className="card big-stat-display">
        <div style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', marginBottom: '0.5rem', fontWeight: 800 }}>
          Media tentativi per indovinare
        </div>
        <div className="stat-number">
          {stats.avg_attempts_to_guess || '—'}
        </div>
        <div className="stat-unit">tentativi per parola</div>
      </div>
    </>
  );
}
