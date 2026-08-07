import { fetchRandomWords } from '../services/wordService.js';

/**
 * Controller per le parole casuali.
 */

/**
 * GET /api/words/random
 */
export async function getRandomWords(req, res) {
  try {
    let count = parseInt(req.query.count) || 5;
    count = Math.min(Math.max(count, 1), 20);

    const words = await fetchRandomWords(count);
    res.json({ words });
  } catch (err) {
    console.error('Errore fetch parole:', err);
    res.status(500).json({ error: 'Errore nel recupero delle parole' });
  }
}
