import * as leaderboardService from '../services/leaderboardService.js';

/**
 * Controller per le classifiche.
 */

/**
 * GET /api/leaderboard/artists
 */
export function getArtists(req, res) {
  try {
    let limit = parseInt(req.query.limit) || 10;
    limit = Math.min(Math.max(limit, 1), 50);

    const leaderboard = leaderboardService.getArtistLeaderboard(limit);
    res.json({ leaderboard });
  } catch (err) {
    console.error('Errore classifica artisti:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

/**
 * GET /api/leaderboard/guessers
 */
export function getGuessers(req, res) {
  try {
    let limit = parseInt(req.query.limit) || 10;
    limit = Math.min(Math.max(limit, 1), 50);

    const leaderboard = leaderboardService.getGuesserLeaderboard(limit);
    res.json({ leaderboard });
  } catch (err) {
    console.error('Errore classifica giocatori:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}
