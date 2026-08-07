import * as User from '../models/User.js';
import * as authService from '../services/authService.js';

/**
 * Controller per le operazioni di autenticazione.
 */

/**
 * POST /api/auth/register
 */
export async function register(req, res) {
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
    const existingUser = User.existsByUsernameOrEmail(username, email);

    if (existingUser) {
      return res.status(409).json({ error: 'Username o email già in uso' });
    }

    // Hash password
    const passwordHash = await authService.hashPassword(password);

    // Inserisci utente
    const { lastId } = User.create(username, email, passwordHash);

    const user = { id: lastId, username, email };

    // Genera token
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);

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
}

/**
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password sono obbligatori' });
    }

    // Cerca utente per username o email
    const user = User.findByUsernameOrEmail(username, username);

    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Verifica password
    const isValid = await authService.verifyPassword(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const userPayload = { id: user.id, username: user.username, email: user.email };

    const accessToken = authService.generateAccessToken(userPayload);
    const refreshToken = authService.generateRefreshToken(userPayload);

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
}

/**
 * POST /api/auth/refresh
 */
export function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token mancante' });
    }

    const decoded = authService.verifyRefreshToken(refreshToken);

    const user = User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    const accessToken = authService.generateAccessToken(user);
    const newRefreshToken = authService.generateRefreshToken(user);

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
}

/**
 * GET /api/auth/me
 */
export function me(req, res) {
  try {
    const user = User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Errore profilo:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}
