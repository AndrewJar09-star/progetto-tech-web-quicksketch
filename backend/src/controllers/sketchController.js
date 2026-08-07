import * as Sketch from '../models/Sketch.js';
import * as Guess from '../models/Guess.js';
import { queryOne } from '../config/database.js';

/**
 * Controller per le operazioni sugli sketch.
 */

/**
 * GET /api/sketches
 */
export function list(req, res) {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 12;
    limit = Math.min(Math.max(limit, 1), 50);
    const offset = (page - 1) * limit;
    const authorFilter = req.query.author || null;

    const { sketches, total } = Sketch.findAll({ limit, offset, authorFilter });

    // Aggiungi info se l'utente corrente ha già indovinato o esaurito i tentativi
    const enrichedSketches = sketches.map(sketch => {
      const result = { ...sketch };

      if (req.user) {
        // Verifica se l'utente è l'autore
        result.is_own = sketch.author_id === req.user.id;

        // Conta tentativi dell'utente su questo sketch
        const userGuesses = Guess.countBySketchAndUser(sketch.id, req.user.id);

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
}

/**
 * GET /api/sketches/:id
 */
export function detail(req, res) {
  try {
    const sketchId = parseInt(req.params.id);

    const sketch = Sketch.findById(sketchId);

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
        const userGuesses = Guess.countBySketchAndUser(sketchId, req.user.id);

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
}

/**
 * POST /api/sketches
 */
export function create(req, res) {
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

    // Un'immagine PNG da canvas 700x500 completamente bianca è circa 14.9KB (~14918-18778 char)
    // Se è più corta di 1000 char o manifestamente non valida, rifiuta
    if (imageData.length < 500) {
      return res.status(400).json({ error: 'Il disegno risulta vuoto o non valido' });
    }

    const { lastId } = Sketch.create(req.user.id, word.trim().toLowerCase(), imageData, timeLimit || 60);

    const sketch = queryOne('SELECT * FROM sketches WHERE id = ?', [lastId]);

    res.status(201).json({
      message: 'Sketch creato con successo',
      sketch
    });
  } catch (err) {
    console.error('Errore creazione sketch:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

/**
 * POST /api/sketches/:id/guess
 */
export function guess(req, res) {
  try {
    const sketchId = parseInt(req.params.id);
    const { guess } = req.body;

    if (!guess || typeof guess !== 'string' || guess.trim().length === 0) {
      return res.status(400).json({ error: 'Il tentativo non può essere vuoto' });
    }

    // Verifica che lo sketch esista
    const sketch = Sketch.findByIdSimple(sketchId);

    if (!sketch) {
      return res.status(404).json({ error: 'Sketch non trovato' });
    }

    // Non puoi indovinare il tuo stesso sketch
    if (sketch.author_id === req.user.id) {
      return res.status(403).json({ error: 'Non puoi indovinare il tuo stesso sketch' });
    }

    // Conta tentativi esistenti
    const existingGuesses = Guess.countBySketchAndUser(sketchId, req.user.id);

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
    Guess.create(sketchId, req.user.id, normalizedGuess, isCorrect, attemptNumber);

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
}

/**
 * GET /api/sketches/:id/guesses
 */
export function guessHistory(req, res) {
  try {
    const sketchId = parseInt(req.params.id);

    const guesses = Guess.findBySketchAndUser(sketchId, req.user.id);

    res.json({ guesses });
  } catch (err) {
    console.error('Errore storico tentativi:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

/**
 * DELETE /api/sketches/:id
 */
export function remove(req, res) {
  try {
    const sketchId = parseInt(req.params.id);
    const sketch = Sketch.findByIdSimple(sketchId);

    if (!sketch) {
      return res.status(404).json({ error: 'Sketch non trovato' });
    }

    if (sketch.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Puoi eliminare solo i tuoi sketch' });
    }

    Sketch.deleteById(sketchId, req.user.id);
    res.json({ message: 'Sketch eliminato con successo' });
  } catch (err) {
    console.error('Errore eliminazione sketch:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}
