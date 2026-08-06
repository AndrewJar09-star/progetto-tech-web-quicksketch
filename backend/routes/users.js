import { Router } from 'express';
import { queryOne } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/users/:id/stats
 * Statistiche dettagliate di un utente.
 * Accessibile solo all'utente stesso (auth required).
 */
router.get('/:id/stats', authenticate, (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Verifica che l'utente richieda le proprie statistiche
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Puoi visualizzare solo le tue statistiche' });
    }

    // Info utente
    const user = queryOne(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Numero di disegni prodotti
    const sketchCount = queryOne(
      'SELECT COUNT(*) as total_sketches FROM sketches WHERE author_id = ?',
      [userId]
    );

    // Statistiche come artista: quanti dei propri sketch sono stati indovinati
    const artistStats = queryOne(`
      SELECT
        COUNT(DISTINCT CASE WHEN g.is_correct = 1 THEN g.user_id || '-' || g.sketch_id END) as sketches_guessed_by_others,
        COUNT(DISTINCT CASE WHEN g.id IS NOT NULL THEN g.user_id || '-' || g.sketch_id END) as total_play_sessions
      FROM sketches s
      LEFT JOIN guesses g ON g.sketch_id = s.id
      WHERE s.author_id = ?
    `, [userId]);

    // Numero di parole indovinate (come giocatore)
    const guessedCount = queryOne(
      'SELECT COUNT(DISTINCT sketch_id) as words_guessed FROM guesses WHERE user_id = ? AND is_correct = 1',
      [userId]
    );

    // Numero di parole non indovinate (tentativi esauriti senza successo)
    const failedCount = queryOne(`
      SELECT COUNT(*) as words_failed FROM (
        SELECT sketch_id,
               COUNT(*) as attempts,
               MAX(is_correct) as any_correct
        FROM guesses
        WHERE user_id = ?
        GROUP BY sketch_id
        HAVING attempts >= 10 AND any_correct = 0
      )
    `, [userId]);

    // Sketch ancora in corso (tentativi < 10 e non ancora indovinati)
    const inProgressCount = queryOne(`
      SELECT COUNT(*) as words_in_progress FROM (
        SELECT sketch_id,
               COUNT(*) as attempts,
               MAX(is_correct) as any_correct
        FROM guesses
        WHERE user_id = ?
        GROUP BY sketch_id
        HAVING attempts < 10 AND any_correct = 0
      )
    `, [userId]);

    // Totale tentativi effettuati
    const totalGuesses = queryOne(
      'SELECT COUNT(*) as total_guesses FROM guesses WHERE user_id = ?',
      [userId]
    );

    // Media tentativi per indovinare (solo quelli corretti)
    const avgAttempts = queryOne(`
      SELECT ROUND(AVG(attempt_number), 1) as avg_attempts
      FROM guesses
      WHERE user_id = ? AND is_correct = 1
    `, [userId]);

    const total_sketches = sketchCount ? sketchCount.total_sketches : 0;
    const sketches_guessed_by_others = artistStats ? artistStats.sketches_guessed_by_others : 0;
    const total_play_sessions = artistStats ? artistStats.total_play_sessions : 0;

    res.json({
      user,
      stats: {
        // Come artista
        total_sketches,
        sketches_guessed_by_others,
        total_play_sessions,
        artist_success_rate: total_play_sessions > 0
          ? Math.round(sketches_guessed_by_others / total_play_sessions * 100 * 10) / 10
          : 0,

        // Come giocatore
        words_guessed: guessedCount ? guessedCount.words_guessed : 0,
        words_failed: failedCount ? failedCount.words_failed : 0,
        words_in_progress: inProgressCount ? inProgressCount.words_in_progress : 0,
        total_guesses: totalGuesses ? totalGuesses.total_guesses : 0,
        avg_attempts_to_guess: avgAttempts ? avgAttempts.avg_attempts || 0 : 0
      }
    });
  } catch (err) {
    console.error('Errore statistiche utente:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default router;
