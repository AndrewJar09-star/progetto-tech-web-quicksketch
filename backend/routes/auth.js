import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, runQuery } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Genera un access token JWT.
 */
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

/**
 * Genera un refresh token JWT.
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /api/auth/register
 * Registrazione nuovo utente.
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validazione input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email e password sono obbligatori' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Lo username deve essere tra 3 e 30 caratteri' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Lo username può contenere solo lettere, numeri e underscore' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email non valida' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La password deve essere di almeno 6 caratteri' });
    }

    // Verifica unicità username e email
    const existingUser = queryOne(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(409).json({ error: 'Username o email già in uso' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Inserisci utente
    const { lastId } = runQuery(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const user = { id: lastId, username, email };

    // Genera token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      message: 'Registrazione completata con successo',
      user: { id: user.id, username: user.username, email: user.email },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Errore registrazione:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * POST /api/auth/login
 * Login utente.
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password sono obbligatori' });
    }

    // Cerca utente per username o email
    const user = queryOne(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Verifica password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const userPayload = { id: user.id, username: user.username, email: user.email };

    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    res.json({
      message: 'Login effettuato con successo',
      user: { id: user.id, username: user.username, email: user.email },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Errore login:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * POST /api/auth/refresh
 * Rinnova l'access token usando il refresh token.
 */
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token mancante' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = queryOne('SELECT id, username, email FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token scaduto, effettua nuovamente il login' });
    }
    return res.status(401).json({ error: 'Refresh token non valido' });
  }
});

/**
 * GET /api/auth/me
 * Restituisce il profilo dell'utente autenticato.
 */
router.get('/me', authenticate, (req, res) => {
  try {
    const user = queryOne(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Errore profilo:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default router;
