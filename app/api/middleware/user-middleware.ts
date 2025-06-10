/**
 * User Middleware
 * 
 * Middleware for handling user authentication and session data
 */

import { Request, Response, NextFunction } from 'express';

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
 * Extract the user ID from X-User-Id header and attach it to the request object
 */
export function extractUserId(req: Request, res: Response, next: NextFunction) {
  try {
    // Get user ID from the X-User-Id header
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required. User ID not provided.' });
    }
    
    // Attach user info to the request object
    req.user = {
      id: Array.isArray(userId) ? userId[0] : userId
    };
    
    next();
  } catch (error) {
    console.error('Error extracting user ID:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

/**
 * Debug middleware to log the user ID
 */
export function logUserInfo(req: Request, res: Response, next: NextFunction) {
  console.log('User ID:', req.user?.id);
  next();
} 