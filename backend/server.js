import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initDatabase } from './src/config/database.js';

// Import routes
import authRoutes from './src/routes/authRoutes.js';
import sketchRoutes from './src/routes/sketchRoutes.js';
import wordRoutes from './src/routes/wordRoutes.js';
import leaderboardRoutes from './src/routes/leaderboardRoutes.js';
import userRoutes from './src/routes/userRoutes.js';

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
app.use('/api/sketches', sketchRoutes);
app.use('/api/words', wordRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', userRoutes);

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
    const server = app.listen(PORT, () => {
      console.log(`\n🎨 QUICKSKETCH Backend avviato su http://localhost:${PORT}`);
      console.log(`📝 API disponibile su http://localhost:${PORT}/api`);
      console.log(`💚 Health check: http://localhost:${PORT}/api/health\n`);
    });

    let isShuttingDown = false;
    const shutdown = (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n🛑 Ricevuto ${signal}. Chiusura server e rilascio porta ${PORT}...`);

      try {
        saveDatabase();
      } catch (err) {
        console.error('Errore durante il salvataggio del database:', err);
      }

      if (server && typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }

      server.close(() => {
        console.log('✅ Backend terminato e porta 3000 rilasciata.');
        process.exit(0);
      });

      // Timeout di sicurezza per forzare l'uscita entro 1 secondo
      setTimeout(() => {
        console.log('⚠️ Chiusura forzata del processo server.');
        process.exit(0);
      }, 1000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err);
      shutdown('uncaughtException');
    });
  } catch (err) {
    console.error('❌ Errore avvio server:', err);
    process.exit(1);
  }
})();

export default app;
