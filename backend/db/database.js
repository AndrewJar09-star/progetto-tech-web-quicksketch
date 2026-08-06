import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'quicksketch.db');

let db;

/**
 * Inizializza il database SQLite (sql.js - puro JS, no compilazione nativa).
 * Carica il DB da file se esiste, altrimenti ne crea uno nuovo.
 * @returns {Promise<object>} Istanza del database sql.js
 */
export async function initDatabase() {
  const SQL = await initSqlJs();

  // Carica DB esistente o crea nuovo
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Abilita foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Creazione tabelle
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sketches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      word TEXT NOT NULL,
      image_data TEXT NOT NULL,
      time_limit INTEGER DEFAULT 60,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS guesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sketch_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      guess_text TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      attempt_number INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sketch_id) REFERENCES sketches(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(sketch_id, user_id, attempt_number)
    )
  `);

  // Indici per performance
  db.run('CREATE INDEX IF NOT EXISTS idx_sketches_author ON sketches(author_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_guesses_sketch ON guesses(sketch_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_guesses_user ON guesses(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_guesses_sketch_user ON guesses(sketch_id, user_id)');

  // Salva su disco
  saveDatabase();

  console.log('✅ Database inizializzato con successo');
  return db;
}

/**
 * Salva il database su disco.
 */
export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Restituisce l'istanza del database.
 * @returns {object} Database sql.js
 */
export function getDb() {
  if (!db) {
    throw new Error('Database non inizializzato. Chiama initDatabase() prima.');
  }
  return db;
}

/**
 * Helper: esegue una query SELECT e restituisce tutte le righe come array di oggetti.
 * @param {string} sql - Query SQL
 * @param {Array} params - Parametri della query
 * @returns {Array<object>}
 */
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Helper: esegue una query SELECT e restituisce la prima riga come oggetto.
 * @param {string} sql - Query SQL
 * @param {Array} params - Parametri della query
 * @returns {object|null}
 */
export function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Helper: esegue una query INSERT/UPDATE/DELETE e salva su disco.
 * @param {string} sql - Query SQL
 * @param {Array} params - Parametri della query
 * @returns {{ changes: number, lastId: number }}
 */
export function runQuery(sql, params = []) {
  db.run(sql, params);
  const changes = db.getRowsModified();
  const lastIdResult = queryOne('SELECT last_insert_rowid() as id');
  const lastId = lastIdResult ? lastIdResult.id : 0;
  saveDatabase();
  return { changes, lastId };
}
