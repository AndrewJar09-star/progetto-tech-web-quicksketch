import { Router } from 'express';
import { queryAll } from '../db/database.js';

const router = Router();

/**
 * GET /api/leaderboard/artists
 * Classifica dei migliori disegnatori.
 * Ordinata per percentuale di sketch indovinati correttamente dagli utenti.
 * Query params:
 *   - limit (default: 10, max: 50)
 */
router.get('/artists', (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 10;
    limit = Math.min(Math.max(limit, 1), 50);

    const artists = queryAll(`
      SELECT
        u.id,
        u.username,
        COUNT(DISTINCT s.id) as total_sketches,
        COUNT(DISTINCT CASE WHEN g.is_correct = 1 THEN g.user_id || '-' || g.sketch_id END) as total_correct_guesses,
        COUNT(DISTINCT CASE WHEN g.id IS NOT NULL THEN g.user_id || '-' || g.sketch_id END) as total_guess_sessions,
        CASE
          WHEN COUNT(DISTINCT CASE WHEN g.id IS NOT NULL THEN g.user_id || '-' || g.sketch_id END) > 0
          THEN ROUND(
            CAST(COUNT(DISTINCT CASE WHEN g.is_correct = 1 THEN g.user_id || '-' || g.sketch_id END) AS REAL) /
            COUNT(DISTINCT CASE WHEN g.id IS NOT NULL THEN g.user_id || '-' || g.sketch_id END) * 100, 1
          )
          ELSE 0
        END as guess_rate
      FROM users u
      JOIN sketches s ON s.author_id = u.id
      LEFT JOIN guesses g ON g.sketch_id = s.id
      GROUP BY u.id
      HAVING COUNT(DISTINCT s.id) > 0
      ORDER BY guess_rate DESC, total_sketches DESC
      LIMIT ?
    `, [limit]);

    res.json({ leaderboard: artists });
  } catch (err) {
    console.error('Errore classifica artisti:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * GET /api/leaderboard/guessers
 * Classifica dei migliori giocatori.
 * Ordinata per numero di parole indovinate.
 * Query params:
 *   - limit (default: 10, max: 50)
 */
router.get('/guessers', (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 10;
    limit = Math.min(Math.max(limit, 1), 50);

    const guessers = queryAll(`
      SELECT
        u.id,
        u.username,
        COUNT(DISTINCT CASE WHEN g.is_correct = 1 THEN g.sketch_id END) as words_guessed,
        COUNT(DISTINCT g.sketch_id) as sketches_attempted,
        SUM(CASE WHEN g.is_correct = 1 THEN g.attempt_number ELSE 0 END) as total_attempts_for_correct,
        CASE
          WHEN COUNT(DISTINCT CASE WHEN g.is_correct = 1 THEN g.sketch_id END) > 0
          THEN ROUND(
            CAST(SUM(CASE WHEN g.is_correct = 1 THEN g.attempt_number ELSE 0 END) AS REAL) /
            COUNT(DISTINCT CASE WHEN g.is_correct = 1 THEN g.sketch_id END), 1
          )
          ELSE 0
        END as avg_attempts
      FROM users u
      JOIN guesses g ON g.user_id = u.id
      GROUP BY u.id
      HAVING COUNT(DISTINCT CASE WHEN g.is_correct = 1 THEN g.sketch_id END) > 0
      ORDER BY words_guessed DESC, avg_attempts ASC
      LIMIT ?
    `, [limit]);

    res.json({ leaderboard: guessers });
  } catch (err) {
    console.error('Errore classifica giocatori:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default router;
