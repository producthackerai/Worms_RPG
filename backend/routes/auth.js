import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/auth/me — validate token, return user profile
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    displayName: req.user.user_metadata?.display_name || req.user.email?.split('@')[0] || 'Player'
  });
});

export default router;
