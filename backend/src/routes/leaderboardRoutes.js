import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboardController.js';

const router = Router();

router.get('/artists', leaderboardController.getArtists);
router.get('/guessers', leaderboardController.getGuessers);

export default router;
