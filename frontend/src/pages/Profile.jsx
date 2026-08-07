import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserStats } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Profile() {
  const { user, loggedIn } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (!loggedIn || !user) return null;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <h1>👤 Il Mio Profilo</h1>
      </div>

      <div className="card text-center" style={{ marginBottom: '2rem' }}>
        <div
          className="navbar-avatar"
          style={{ width: '64px', height: '64px', fontSize: '1.8rem', margin: '0 auto 1rem' }}
        >
          {user.username.charAt(0).toUpperCase()}
        </div>
        <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>{user.username}</h2>
        <p className="text-muted">{user.email}</p>
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
