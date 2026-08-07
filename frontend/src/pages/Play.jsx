import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSketch, submitGuess, getGuessHistory } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import HeartLives from '../components/HeartLives.jsx';

export default function Play() {
  const { id } = useParams();
  const { loggedIn } = useAuth();
  const { showToast } = useToast();
  const [sketch, setSketch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSketch();
  }, [id]);

  async function loadSketch() {
    setLoading(true);
    try {
      const { sketch: s } = await getSketch(id);
      setSketch(s);
    } catch (err) {
      setError(err.error || 'Sketch non trovato');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="play-layout">
        <div id="sketch-panel"><div className="spinner"></div></div>
        <div id="guess-panel"><div className="spinner"></div></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">😕</div>
        <h3>Sketch non trovato</h3>
        <p>Lo sketch potrebbe essere stato rimosso.</p>
        <a href="#/home" className="btn btn-primary">Torna alla Home</a>
      </div>
    );
  }

  return (
    <div className="play-layout">
      <div id="sketch-panel">
        <SketchPanel sketch={sketch} />
      </div>
      <div id="guess-panel">
        {loggedIn ? (
          <GuessPanel sketch={sketch} onUpdate={loadSketch} showToast={showToast} />
        ) : (
          <div className="card text-center">
            <h3>Vuoi provare a indovinare?</h3>
            <p className="text-muted mt-1">Accedi per iniziare a giocare!</p>
            <a href="#/auth" className="btn btn-primary mt-2">Accedi</a>
          </div>
        )}
      </div>
    </div>
  );
}

function SketchPanel({ sketch }) {
  const date = new Date(sketch.created_at).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="card">
      <div className="sketch-detail-image">
        <img src={sketch.image_data} alt="Sketch" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontWeight: 800 }}>di <span style={{ color: 'var(--magenta)' }}>{sketch.author_username}</span></div>
          <div className="text-muted" style={{ fontSize: '0.8rem' }}>{date}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', fontWeight: 700 }}>
          <span>👥 {sketch.total_players} giocatori</span>
          <span>✅ {sketch.times_guessed} indovinato</span>
        </div>
      </div>
      {sketch.word && (
        <div className="word-reveal">
          <span className="word-label">La parola era:</span>
          <div className="word-value">{sketch.word}</div>
        </div>
      )}
    </div>
  );
}

function GuessPanel({ sketch, onUpdate, showToast }) {
  const [history, setHistory] = useState([]);
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sketch.user_attempts > 0 || sketch.user_has_guessed || sketch.user_exhausted) {
      loadHistory();
    }
  }, [sketch]);

  async function loadHistory() {
    try {
      const { guesses } = await getGuessHistory(sketch.id);
      setHistory(guesses);
    } catch {
      setHistory([]);
    }
  }

  // Sketch proprio
  if (sketch.is_own) {
    return (
      <div className="card text-center">
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✏️</div>
        <h3>Questo è il tuo sketch!</h3>
        <p className="text-muted mt-1">Non puoi indovinare il tuo stesso disegno.</p>
        <div className="word-reveal" style={{ marginTop: '1.5rem' }}>
          <div className="word-label">Parola scelta:</div>
          <div className="word-value" style={{ color: 'var(--purple)' }}>{sketch.word}</div>
        </div>
        <div className="mt-2" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
          👥 {sketch.total_players} giocatori · ✅ {sketch.times_guessed} hanno indovinato
        </div>
      </div>
    );
  }

  // Già indovinato
  if (sketch.user_has_guessed) {
    return (
      <div className="card">
        <div className="text-center" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem' }}>🎉</div>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--green)' }}>Hai indovinato!</h3>
          <div className="word-value">{sketch.word}</div>
        </div>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', marginBottom: '0.5rem', fontWeight: 800 }}>I tuoi tentativi:</h4>
        <GuessHistory guesses={history} />
      </div>
    );
  }

  // Tentativi esauriti
  if (sketch.user_exhausted) {
    return (
      <div className="card">
        <div className="text-center" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem' }}>😞</div>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--red)' }}>Tentativi esauriti</h3>
          <div className="mt-1">La parola era: <strong style={{ fontFamily: 'var(--font-heading)' }}>{sketch.word}</strong></div>
        </div>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', marginBottom: '0.5rem', fontWeight: 800 }}>I tuoi tentativi:</h4>
        <GuessHistory guesses={history} />
      </div>
    );
  }

  // Pannello attivo
  const attemptsUsed = sketch.user_attempts || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const g = guess.trim();
    if (!g) return;
    setLoading(true);

    try {
      const result = await submitGuess(sketch.id, g);

      if (result.is_correct) {
        showToast('🎉 Bravo! Hai indovinato!', 'success');
        await onUpdate();
      } else if (result.attempts_remaining <= 0) {
        showToast('😞 Tentativi esauriti!', 'error');
        await onUpdate();
      } else {
        setMessage({
          text: g,
          remaining: result.attempts_remaining
        });
        await loadHistory();
        await onUpdate();
        setGuess('');
        setLoading(false);
      }
    } catch (err) {
      showToast(err.error || 'Errore nell\'invio del tentativo', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>🎯 Indovina la parola!</h3>

      <HeartLives used={attemptsUsed} total={10} />

      <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center', fontWeight: 700 }}>
        Tentativi rimasti: <strong style={{ color: 'var(--ink)' }}>{10 - attemptsUsed}</strong> / 10
      </p>

      <form id="guess-form" onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          className="form-input"
          type="text"
          id="guess-input"
          placeholder="Scrivi la tua risposta..."
          required
          autoComplete="off"
          value={guess}
          onChange={e => setGuess(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" id="guess-submit" disabled={loading}>
          {loading ? '...' : 'Prova'}
        </button>
      </form>

      <div id="guess-message">
        {message && (
          <div className="guess-item wrong" style={{ marginBottom: '0.5rem' }}>
            <span className="guess-result-icon">❌</span>
            <span>{message.text}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
              {message.remaining} tentativi rimasti
            </span>
          </div>
        )}
      </div>

      <div id="guess-history">
        {history.length > 0 && (
          <>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', marginBottom: '0.5rem', marginTop: '1rem', fontWeight: 800 }}>Tentativi precedenti:</h4>
            <GuessHistory guesses={history} />
          </>
        )}
      </div>
    </div>
  );
}

function GuessHistory({ guesses }) {
  if (!guesses || guesses.length === 0) return null;

  return (
    <ul className="guess-list">
      {guesses.map(g => (
        <li key={g.id || g.attempt_number} className={`guess-item ${g.is_correct ? 'correct' : 'wrong'}`}>
          <span className="guess-number">#{g.attempt_number}</span>
          <span>{g.guess_text}</span>
          <span className="guess-result-icon" style={{ marginLeft: 'auto' }}>
            {g.is_correct ? '✅' : '❌'}
          </span>
        </li>
      ))}
    </ul>
  );
}
