import { queryOne, queryAll, runQuery } from '../config/database.js';

/**
 * Model per la tabella sketches.
 */

/**
 * Lista sketch paginata con informazioni autore e statistiche.
 */
export function findAll({ limit, offset, authorFilter = null }) {
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

  return { sketches, total };
}

/**
 * Dettaglio singolo sketch con statistiche.
 */
export function findById(id) {
  return queryOne(`
    SELECT s.*, u.username as author_username,
      (SELECT COUNT(DISTINCT g.user_id) FROM guesses g WHERE g.sketch_id = s.id AND g.is_correct = 1) as times_guessed,
      (SELECT COUNT(DISTINCT g.user_id) FROM guesses g WHERE g.sketch_id = s.id) as total_players
    FROM sketches s
    JOIN users u ON s.author_id = u.id
    WHERE s.id = ?
  `, [id]);
}

/**
 * Cerca sketch per ID (versione semplice).
 */
export function findByIdSimple(id) {
  return queryOne('SELECT * FROM sketches WHERE id = ?', [id]);
}

/**
 * Crea un nuovo sketch.
 */
export function create(authorId, word, imageData, timeLimit = 60) {
  return runQuery(
    'INSERT INTO sketches (author_id, word, image_data, time_limit) VALUES (?, ?, ?, ?)',
    [authorId, word, imageData, timeLimit]
  );
}

/**
 * Elimina uno sketch per ID (solo se l'autore coincide).
 */
export function deleteById(id, authorId) {
  return runQuery(
    'DELETE FROM sketches WHERE id = ? AND author_id = ?',
    [id, authorId]
  );
}
