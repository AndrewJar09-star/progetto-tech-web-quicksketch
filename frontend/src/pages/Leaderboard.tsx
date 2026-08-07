import React, { useState, useEffect } from 'react';
import { getArtistLeaderboard, getGuesserLeaderboard } from '../api';
import { ArtistLeaderboardItem, GuesserLeaderboardItem, ApiError } from '../types';

export default function Leaderboard() {
  const [tab, setTab] = useState<'artists' | 'guessers'>('artists');
  const [artists, setArtists] = useState<ArtistLeaderboardItem[]>([]);
  const [guessers, setGuessers] = useState<GuesserLeaderboardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllLeaderboards();
  }, []);

  async function loadAllLeaderboards() {
    setLoading(true);
    setError(null);
    try {
      const [resArtists, resGuessers] = await Promise.all([
        getArtistLeaderboard(20),
        getGuesserLeaderboard(20)
      ]);
      setArtists(resArtists.leaderboard || []);
      setGuessers(resGuessers.leaderboard || []);
    } catch (err: any) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Impossibile caricare le classifiche.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>🏆 Classifiche</h1>
        <p>I migliori disegnatori e giocatori di QuickSketch</p>
      </div>

      <div className="leaderboard-tabs">
        <button
          className={`leaderboard-tab${tab === 'artists' ? ' active' : ''}`}
          id="tab-artists"
          onClick={() => setTab('artists')}
        >
          🎨 Artisti
        </button>
        <button
          className={`leaderboard-tab${tab === 'guessers' ? ' active' : ''}`}
          id="tab-guessers"
          onClick={() => setTab('guessers')}
        >
          🎯 Giocatori
        </button>
      </div>

      <div id="leaderboard-content">
        {loading ? (
          <div className="spinner"></div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h3>Errore nel caricamento</h3>
            <p>{error}</p>
          </div>
        ) : tab === 'artists' ? (
          artists.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎨</div>
              <h3>Nessun artista ancora</h3>
              <p>Crea il tuo primo sketch per apparire in classifica!</p>
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Artista</th>
                    <th>Sketch</th>
                    <th>Indovinati</th>
                    <th>% Successo</th>
                  </tr>
                </thead>
                <tbody>
                  {artists.map((artist: any, i: number) => (
                    <tr key={artist.id}>
                      <td>
                        <span className={`rank-badge ${i < 3 ? `rank-${i + 1}` : 'rank-other'}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800 }}>{artist.username}</td>
                      <td>{artist.total_sketches}</td>
                      <td>{artist.total_correct_guesses ?? artist.total_guesses_received ?? 0}</td>
                      <td>
                        <span style={{ color: 'var(--ink)', fontWeight: 800 }}>
                          {artist.guess_rate ?? artist.success_rate ?? 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          guessers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <h3>Nessun giocatore ancora</h3>
              <p>Prova a indovinare uno sketch per apparire in classifica!</p>
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Giocatore</th>
                    <th>Parole Indovinate</th>
                    <th>Sketch Tentati</th>
                    <th>Media Tentativi</th>
                  </tr>
                </thead>
                <tbody>
                  {guessers.map((guesser: any, i: number) => (
                    <tr key={guesser.id}>
                      <td>
                        <span className={`rank-badge ${i < 3 ? `rank-${i + 1}` : 'rank-other'}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800 }}>{guesser.username}</td>
                      <td style={{ color: 'var(--ink)', fontWeight: 800 }}>{guesser.words_guessed}</td>
                      <td>{guesser.sketches_attempted || guesser.total_attempts}</td>
                      <td>{guesser.avg_attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </>
  );
}
