import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Middleware to ensure a user profile exists before proceeding with the request
 * If a user ID is provided in X-User-Id header but no profile exists, it creates one
 */
export async function ensureUserProfile(req: Request, res: Response, next: NextFunction) {
  try {
    // Get user ID from header
    const userId = req.headers["x-user-id"] as string;
    
    if (!userId) {
      // No user ID provided, continue without profile check
      return next();
    }
    
    // Check if profile exists
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });
    
    if (!profile) {
      console.log(`Creating profile for user ID: ${userId}`);
      // Create a profile if it doesn't exist
      await prisma.profile.create({
        data: {
          userId,
          profileCreatedAt: new Date()
        }
      });
    }
    
    // Attach to request for later use
    req.userId = userId;
    
    next();
  } catch (error) {
    console.error('Error in profile middleware:', error);
    next(error);
  }
}

// Add TypeScript declaration for extended Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
} 