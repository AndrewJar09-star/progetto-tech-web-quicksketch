import { Router } from 'express';
import * as sketchController from '../controllers/sketchController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, sketchController.list);
router.get('/:id', optionalAuth, sketchController.detail);
router.post('/', authenticate, sketchController.create);
router.post('/:id/guess', authenticate, sketchController.guess);
router.get('/:id/guesses', authenticate, sketchController.guessHistory);

export default router;
