import { Request, Response, NextFunction } from 'express';
import { extractJwtFromHeader, verifyToken } from '../supabase-client';

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        // Add other user properties as needed
      };
    }
  }
}

/**
 * Authentication middleware that validates Supabase JWT tokens
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    const token = extractJwtFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication failed: No token provided' });
    }
    
    // Verify the token with Supabase
    const { valid, user } = await verifyToken(token);
    
    if (!valid || !user) {
      return res.status(401).json({ error: 'Authentication failed: Invalid token' });
    }
    
    // Set verified user info on the request
    req.user = { 
      id: user.id,
      email: user.email
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}; 