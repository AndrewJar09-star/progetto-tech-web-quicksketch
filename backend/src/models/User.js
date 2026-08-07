import { queryOne, queryAll, runQuery } from '../config/database.js';

/**
 * Model per la tabella users.
 */

/**
 * Cerca un utente per username o email.
 */
export function findByUsernameOrEmail(username, email) {
  return queryOne(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, email || username]
  );
}

export function findById(id) {
  return queryOne(
    'SELECT id, username, email, avatar_url, created_at FROM users WHERE id = ?',
    [id]
  );
}

/**
 * Aggiorna l'avatar dell'utente.
 */
export function updateAvatar(id, avatarUrl) {
  return runQuery(
    'UPDATE users SET avatar_url = ? WHERE id = ?',
    [avatarUrl, id]
  );
}

/**
 * Cerca un utente per ID (con password hash per auth).
 */
export function findByIdFull(id) {
  return queryOne(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
}

/**
 * Crea un nuovo utente.
 */
export function create(username, email, passwordHash) {
  return runQuery(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    [username, email, passwordHash]
  );
}

/**
 * Verifica se username o email esistono già.
 */
export function existsByUsernameOrEmail(username, email) {
  return queryOne(
    'SELECT id FROM users WHERE username = ? OR email = ?',
    [username, email]
  );
}
