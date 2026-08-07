import * as User from '../models/User.js';
import * as statsService from '../services/statsService.js';

/**
 * Controller per le statistiche utente.
 */

/**
 * GET /api/users/:id/stats
 */
export function getStats(req, res) {
  try {
    const userId = parseInt(req.params.id);

    // Verifica che l'utente richieda le proprie statistiche
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Puoi visualizzare solo le tue statistiche' });
    }

    // Info utente
    const user = User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const stats = statsService.getUserStats(userId);

    res.json({ user, stats });
  } catch (err) {
    console.error('Errore statistiche utente:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}
