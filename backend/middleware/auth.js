import jwt from 'jsonwebtoken';

/**
 * Middleware di autenticazione JWT.
 * Verifica il token Bearer nell'header Authorization.
 * Se valido, aggiunge req.user con { id, username, email }.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token di autenticazione mancante' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token scaduto' });
    }
    return res.status(401).json({ error: 'Token non valido' });
  }
}

/**
 * Middleware opzionale di autenticazione.
 * Se il token è presente e valido, aggiunge req.user.
 * Altrimenti prosegue senza errore (req.user sarà undefined).
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email
    };
  } catch {
    // Token non valido, prosegui senza utente
  }

  next();
}
