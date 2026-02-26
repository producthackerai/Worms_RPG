import { supabase } from '../lib/supabase.js';

// Auth middleware — extracts user from Supabase JWT
export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      req.user = null;
    } else {
      req.user = user;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.user = null;
  }

  next();
};

// Require authenticated user
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};
