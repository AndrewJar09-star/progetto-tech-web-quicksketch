import { Router } from 'express';
import { queryAll, queryOne, runQuery } from '../db/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/sketches
 * Lista sketch paginata (pubblica).
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 12, max: 50)
 *   - author (opzionale): filtra per username autore
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 12;
    limit = Math.min(Math.max(limit, 1), 50);
    const offset = (page - 1) * limit;
    const authorFilter = req.query.author || null;

    // Conta totale sketch
    let countSql = `SELECT COUNT(*) as total FROM sketches s JOIN users u ON s.author_id = u.id`;
    let listSql = `SELECT s.id, s.author_id, u.username as author_username,
                   s.image_data, s.time_limit, s.created_at,
                   (SELECT COUNT(DISTINCT g.user_id) FROM guesses g WHERE g.sketch_id = s.id AND g.is_correct = 1) as times_guessed,
                   (SELECT COUNT(DISTINCT g.user_id) FROM guesses g WHERE g.sketch_id = s.id) as total_players
                   FROM sketches s
                   JOIN users u ON s.author_id = u.id`;

    const params = [];

    if (authorFilter) {
      countSql += ' WHERE u.username = ?';
      listSql += ' WHERE u.username = ?';
      params.push(authorFilter);
    }

    const countResult = queryOne(countSql, params);
    const total = countResult ? countResult.total : 0;

    listSql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    const listParams = [...params, limit, offset];

    const sketches = queryAll(listSql, listParams);

    // Aggiungi info se l'utente corrente ha già indovinato o esaurito i tentativi
    const enrichedSketches = sketches.map(sketch => {
      const result = { ...sketch };

      if (req.user) {
        // Verifica se l'utente è l'autore
        result.is_own = sketch.author_id === req.user.id;

        // Conta tentativi dell'utente su questo sketch
        const userGuesses = queryOne(
          'SELECT COUNT(*) as count, MAX(is_correct) as has_correct FROM guesses WHERE sketch_id = ? AND user_id = ?',
          [sketch.id, req.user.id]
        );

        result.user_attempts = userGuesses ? userGuesses.count : 0;
        result.user_has_guessed = userGuesses ? userGuesses.has_correct === 1 : false;
        result.user_exhausted = (result.user_attempts >= 10) && !result.user_has_guessed;
      }

      return result;
    });

    res.json({
      sketches: enrichedSketches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Errore lista sketch:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * GET /api/sketches/:id
 * Dettaglio singolo sketch.
 * La parola viene rivelata solo se:
 *   - L'utente è l'autore
 *   - L'utente ha indovinato
 *   - L'utente ha esaurito i 10 tentativi
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const sketchId = parseInt(req.params.id);

    const sketch = queryOne(`
      SELECT s.*, u.username as author_username,
        (SELECT COUNT(DISTINCT g.user_id) FROM guesses g WHERE g.sketch_id = s.id AND g.is_correct = 1) as times_guessed,
        (SELECT COUNT(DISTINCT g.user_id) FROM guesses g WHERE g.sketch_id = s.id) as total_players
      FROM sketches s
      JOIN users u ON s.author_id = u.id
      WHERE s.id = ?
    `, [sketchId]);

    if (!sketch) {
      return res.status(404).json({ error: 'Sketch non trovato' });
    }

    const result = { ...sketch };
    let revealWord = false;

    if (req.user) {
      result.is_own = sketch.author_id === req.user.id;

      if (result.is_own) {
        revealWord = true;
      } else {
        const userGuesses = queryOne(
          'SELECT COUNT(*) as count, MAX(is_correct) as has_correct FROM guesses WHERE sketch_id = ? AND user_id = ?',
          [sketchId, req.user.id]
        );

        result.user_attempts = userGuesses ? userGuesses.count : 0;
        result.user_has_guessed = userGuesses ? userGuesses.has_correct === 1 : false;
        result.user_exhausted = (result.user_attempts >= 10) && !result.user_has_guessed;

        if (result.user_has_guessed || result.user_exhausted) {
          revealWord = true;
        }
      }
    }

    if (!revealWord) {
      delete result.word;
    }

    res.json({ sketch: result });
  } catch (err) {
    console.error('Errore dettaglio sketch:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * POST /api/sketches
 * Crea un nuovo sketch (richiede autenticazione).
 * Body: { word, imageData, timeLimit }
 */
router.post('/', authenticate, (req, res) => {
  try {
    const { word, imageData, timeLimit } = req.body;

    if (!word || !imageData) {
      return res.status(400).json({ error: 'Parola e disegno sono obbligatori' });
    }

    if (typeof word !== 'string' || word.trim().length === 0) {
      return res.status(400).json({ error: 'La parola non può essere vuota' });
    }

    if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Il disegno deve essere un\'immagine base64 valida' });
    }

    const { lastId } = runQuery(
      'INSERT INTO sketches (author_id, word, image_data, time_limit) VALUES (?, ?, ?, ?)',
      [req.user.id, word.trim().toLowerCase(), imageData, timeLimit || 60]
    );

    const sketch = queryOne('SELECT * FROM sketches WHERE id = ?', [lastId]);

    res.status(201).json({
      message: 'Sketch creato con successo',
      sketch
    });
  } catch (err) {
    console.error('Errore creazione sketch:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * POST /api/sketches/:id/guess
 * Invia un tentativo per indovinare la parola dello sketch.
 * Body: { guess }
 * Max 10 tentativi per utente per sketch.
 */
router.post('/:id/guess', authenticate, (req, res) => {
  try {
    const sketchId = parseInt(req.params.id);
    const { guess } = req.body;

    if (!guess || typeof guess !== 'string' || guess.trim().length === 0) {
      return res.status(400).json({ error: 'Il tentativo non può essere vuoto' });
    }

    // Verifica che lo sketch esista
    const sketch = queryOne('SELECT * FROM sketches WHERE id = ?', [sketchId]);

    if (!sketch) {
      return res.status(404).json({ error: 'Sketch non trovato' });
    }

    // Non puoi indovinare il tuo stesso sketch
    if (sketch.author_id === req.user.id) {
      return res.status(403).json({ error: 'Non puoi indovinare il tuo stesso sketch' });
    }

    // Conta tentativi esistenti
    const existingGuesses = queryOne(
      'SELECT COUNT(*) as count, MAX(is_correct) as has_correct FROM guesses WHERE sketch_id = ? AND user_id = ?',
      [sketchId, req.user.id]
    );

    const guessCount = existingGuesses ? existingGuesses.count : 0;
    const hasCorrect = existingGuesses ? existingGuesses.has_correct : 0;

    // Verifica se ha già indovinato
    if (hasCorrect === 1) {
      return res.status(400).json({ error: 'Hai già indovinato questa parola!' });
    }

    // Verifica limite tentativi
    if (guessCount >= 10) {
      return res.status(400).json({
        error: 'Hai esaurito i 10 tentativi',
        word: sketch.word
      });
    }

    const attemptNumber = guessCount + 1;
    const normalizedGuess = guess.trim().toLowerCase();
    const isCorrect = normalizedGuess === sketch.word.toLowerCase() ? 1 : 0;

    // Inserisci il tentativo
    runQuery(
      'INSERT INTO guesses (sketch_id, user_id, guess_text, is_correct, attempt_number) VALUES (?, ?, ?, ?, ?)',
      [sketchId, req.user.id, normalizedGuess, isCorrect, attemptNumber]
    );

    const response = {
      attempt_number: attemptNumber,
      is_correct: isCorrect === 1,
      attempts_remaining: 10 - attemptNumber
    };

    if (isCorrect) {
      response.message = '🎉 Bravo! Hai indovinato!';
      response.word = sketch.word;
    } else if (attemptNumber >= 10) {
      response.message = '😞 Hai esaurito i tentativi!';
      response.word = sketch.word;
    } else {
      response.message = `Tentativo ${attemptNumber}/10 - Sbagliato! Riprova.`;
    }

    res.json(response);
  } catch (err) {
    console.error('Errore tentativo:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * GET /api/sketches/:id/guesses
 * Storico tentativi dell'utente autenticato su uno sketch.
 */
router.get('/:id/guesses', authenticate, (req, res) => {
  try {
    const sketchId = parseInt(req.params.id);

    const guesses = queryAll(
      'SELECT id, guess_text, is_correct, attempt_number, created_at FROM guesses WHERE sketch_id = ? AND user_id = ? ORDER BY attempt_number ASC',
      [sketchId, req.user.id]
    );

    res.json({ guesses });
  } catch (err) {
    console.error('Errore storico tentativi:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default router;
