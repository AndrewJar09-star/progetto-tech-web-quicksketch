import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSketches, deleteSketch } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Home() {
  const { loggedIn } = useAuth();
  const { showToast } = useToast();
  const [sketches, setSketches] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadSketches(page);
  }, [page]);

  async function loadSketches(p) {
    setLoading(true);
    setError(null);
    try {
      const data = await getSketches(p, 12);
      setSketches(data.sketches);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.error || 'Impossibile caricare gli sketch.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(sketchId) {
    if (!window.confirm('Sei sicuro di voler eliminare questo sketch?')) return;
    try {
      await deleteSketch(sketchId);
      showToast('Sketch eliminato con successo! 🗑️', 'success');
      setSketches(prev => prev.filter(s => s.id !== sketchId));
    } catch (err) {
      showToast(err.error || 'Errore nell\'eliminazione dello sketch', 'error');
    }
  }

  return (
    <>
      <section className="hero">
        <h1>Disegna, Indovina,<br /><span className="gradient-text">Sfida il Mondo!</span></h1>
        <p>Crea sketch in tempo reale, sfida gli altri a indovinare le tue opere e scala le classifiche di QuickSketch.</p>
        <div className="hero-actions">
          {loggedIn ? (
            <Link to="/create" className="btn btn-primary btn-lg">✏️ Crea uno Sketch</Link>
          ) : (
            <Link to="/auth" className="btn btn-primary btn-lg">🚀 Inizia Ora</Link>
          )}
          <Link to="/leaderboard" className="btn btn-secondary btn-lg">🏆 Classifiche</Link>
        </div>
      </section>

      <section>
        <h2 className="section-title">🖼️ Ultimi Sketch</h2>
        <div id="sketches-grid" className="grid-sketches">
          {loading ? (
            <div className="spinner" style={{ gridColumn: '1 / -1' }}></div>
          ) : error ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">⚠️</div>
              <h3>Errore nel caricamento</h3>
              <p>{error}</p>
              <button className="btn btn-secondary" onClick={() => loadSketches(page)}>Riprova</button>
            </div>
          ) : sketches.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">🎨</div>
              <h3>Nessuno sketch ancora</h3>
              <p>Sii il primo a creare uno sketch e sfidare gli altri!</p>
              <Link to="/create" className="btn btn-primary">Crea il primo Sketch</Link>
            </div>
          ) : (
            sketches.map(sketch => (
              <SketchCard key={sketch.id} sketch={sketch} onDelete={handleDelete} />
            ))
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div id="pagination-container" className="pagination">
            <button
              data-page={page - 1}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← Prec
            </button>
            {renderPageButtons(pagination, page, setPage)}
            <button
              data-page={page + 1}
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Succ →
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function SketchCard({ sketch, onDelete }) {
  const date = new Date(sketch.created_at).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'short'
  });

  let badge = null;
  if (sketch.is_own) {
    badge = <span className="sketch-badge badge-own">✏️ Tuo</span>;
  } else if (sketch.user_has_guessed) {
    badge = <span className="sketch-badge badge-guessed">✅ Indovinato</span>;
  } else if (sketch.user_exhausted) {
    badge = <span className="sketch-badge badge-failed">❌ Fallito</span>;
  } else if (sketch.user_attempts > 0) {
    badge = <span className="sketch-badge badge-play">🎯 {sketch.user_attempts}/10</span>;
  }

  return (
    <article
      className="card card-sketch"
      data-id={sketch.id}
      tabIndex={0}
      role="button"
      aria-label={`Sketch di ${sketch.author_username}`}
      onClick={() => { location.hash = `#/sketch/${sketch.id}`; }}
    >
      <img
        className="sketch-image"
        src={sketch.image_data}
        alt={`Sketch di ${sketch.author_username}`}
        loading="lazy"
      />
      <div className="sketch-info">
        <div className="sketch-author" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>di <strong>{sketch.author_username}</strong> · {date}</span>
          {sketch.is_own && (
            <button
              className="btn-delete-sketch"
              title="Elimina il tuo sketch"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(sketch.id);
              }}
            >
              🗑️
            </button>
          )}
        </div>
        <div className="sketch-meta">
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
            👥 {sketch.total_players} giocatori · ✅ {sketch.times_guessed} indovinato
          </span>
          {badge}
        </div>
      </div>
    </article>
  );
}

function renderPageButtons(pag, currentPage, setPage) {
  const buttons = [];
  for (let i = 1; i <= pag.totalPages; i++) {
    if (pag.totalPages > 7) {
      if (i === 1 || i === pag.totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        buttons.push(
          <button
            key={i}
            data-page={i}
            className={i === currentPage ? 'active' : ''}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        buttons.push(<button key={`dots-${i}`} disabled>…</button>);
      }
    } else {
      buttons.push(
        <button
          key={i}
          data-page={i}
          className={i === currentPage ? 'active' : ''}
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }
  }
  return buttons;
}
