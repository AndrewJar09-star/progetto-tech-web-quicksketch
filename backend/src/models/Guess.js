import { queryOne, queryAll, runQuery } from '../config/database.js';

/**
 * Model per la tabella guesses.
 */

/**
 * Conta i tentativi di un utente su uno sketch e verifica se ha indovinato.
 */
export function countBySketchAndUser(sketchId, userId) {
  return queryOne(
    'SELECT COUNT(*) as count, MAX(is_correct) as has_correct FROM guesses WHERE sketch_id = ? AND user_id = ?',
    [sketchId, userId]
  );
}

/**
 * Crea un nuovo tentativo.
 */
export function create(sketchId, userId, guessText, isCorrect, attemptNumber) {
  return runQuery(
    'INSERT INTO guesses (sketch_id, user_id, guess_text, is_correct, attempt_number) VALUES (?, ?, ?, ?, ?)',
    [sketchId, userId, guessText, isCorrect, attemptNumber]
  );
}

/**
 * Storico tentativi di un utente su uno sketch.
 */
export function findBySketchAndUser(sketchId, userId) {
  return queryAll(
    'SELECT id, guess_text, is_correct, attempt_number, created_at FROM guesses WHERE sketch_id = ? AND user_id = ? ORDER BY attempt_number ASC',
    [sketchId, userId]
  );
}
