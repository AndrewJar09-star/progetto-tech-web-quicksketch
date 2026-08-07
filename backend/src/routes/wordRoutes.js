import { Router } from 'express';
import * as wordController from '../controllers/wordController.js';

const router = Router();

router.get('/random', wordController.getRandomWords);

export default router;
