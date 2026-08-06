import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initDatabase } from './db/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import sketchesRoutes from './routes/sketches.js';
import wordsRoutes from './routes/words.js';
import leaderboardRoutes from './routes/leaderboard.js';
import usersRoutes from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parser (limite aumentato per le immagini base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting globale
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Troppe richieste, riprova tra qualche minuto' }
});
app.use('/api/', limiter);

// Rate limiting per auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Troppi tentativi di autenticazione, riprova tra qualche minuto' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Routes ─────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/sketches', sketchesRoutes);
app.use('/api/words', wordsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

// Error handler globale
app.use((err, req, res, next) => {
  console.error('Errore non gestito:', err);
  res.status(500).json({ error: 'Errore interno del server' });
});

// ── Avvio ──────────────────────────────────────────────────

(async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`\n🎨 QUICKSKETCH Backend avviato su http://localhost:${PORT}`);
      console.log(`📝 API disponibile su http://localhost:${PORT}/api`);
      console.log(`💚 Health check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('❌ Errore avvio server:', err);
    process.exit(1);
  }
})();

export default app;
