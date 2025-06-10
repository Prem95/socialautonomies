import prisma from '../utils/dbClient';
import { handleDatabaseError } from '../utils/errorHandler';
import { CookieCreateInput, CookieSearchParams, CookieUpdateInput, PaginationParams } from '../types';
import { Cookie } from '@prisma/client';

export const cookieRepository = {
  /**
   * Create a new cookie
   */
  async create(data: CookieCreateInput): Promise<Cookie> {
    try {
      return await prisma.cookie.create({ data });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get a cookie by ID
   */
  async findById(cookieId: bigint): Promise<Cookie | null> {
    try {
      return await prisma.cookie.findUnique({
        where: { cookieId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get cookies by user ID
   */
  async findByUserId(userId: string, params?: PaginationParams): Promise<Cookie[]> {
    try {
      const { page = 1, limit = 50 } = params || {};
      const skip = (page - 1) * limit;
      
      return await prisma.cookie.findMany({
        where: { userId },
        skip,
        take: limit
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get a cookie by user ID and key
   */
  async findByUserIdAndKey(userId: string, key: string): Promise<Cookie | null> {
    try {
      return await prisma.cookie.findUnique({
        where: {
          userId_key: {
            userId,
            key
          }
        }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get all cookies
   */
  async findAll(params?: PaginationParams): Promise<Cookie[]> {
    try {
      const { page = 1, limit = 50 } = params || {};
      const skip = (page - 1) * limit;
      
      return await prisma.cookie.findMany({
        skip,
        take: limit
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Search cookies by criteria
   */
  async search(params: CookieSearchParams, pagination?: PaginationParams): Promise<Cookie[]> {
    try {
      const { userId, key, domain, path, notExpired } = params;
      const { page = 1, limit = 50 } = pagination || {};
      const skip = (page - 1) * limit;
      
      let where: any = { userId };
      
      if (key) where.key = key;
      if (domain) where.domain = domain;
      if (path) where.path = path;
      
      // Add condition for non-expired cookies
      if (notExpired) {
        where.OR = [
          { expires: null },
          { expires: { gt: new Date() } }
        ];
      }
      
      return await prisma.cookie.findMany({
        where,
        skip,
        take: limit
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Update cookie
   */
  async update(cookieId: bigint, data: CookieUpdateInput): Promise<Cookie> {
    try {
      return await prisma.cookie.update({
        where: { cookieId },
        data
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Update or create a cookie
   */
  async upsert(userId: string, key: string, data: CookieUpdateInput, createData: CookieCreateInput): Promise<Cookie> {
    try {
      return await prisma.cookie.upsert({
        where: {
          userId_key: {
            userId,
            key
          }
        },
        update: data,
        create: createData as any
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Delete cookie
   */
  async delete(cookieId: bigint): Promise<Cookie> {
    try {
      return await prisma.cookie.delete({
        where: { cookieId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Delete cookie by user ID and key
   */
  async deleteByUserIdAndKey(userId: string, key: string): Promise<Cookie> {
    try {
      return await prisma.cookie.delete({
        where: {
          userId_key: {
            userId,
            key
          }
        }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Delete all cookies for a user
   */
  async deleteAllByUserId(userId: string): Promise<{ count: number }> {
    try {
      return await prisma.cookie.deleteMany({
        where: { userId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Count cookies by user ID
   */
  async countByUserId(userId: string): Promise<number> {
    try {
      return await prisma.cookie.count({
        where: { userId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get all valid (non-expired) cookies for a user
   */
  async getValidCookies(userId: string): Promise<Cookie[]> {
    try {
      return await prisma.cookie.findMany({
        where: {
          userId,
          OR: [
            { expires: null },
            { expires: { gt: new Date() } }
          ]
        }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Delete all expired cookies
   */
  async deleteExpiredCookies(): Promise<{ count: number }> {
    try {
      return await prisma.cookie.deleteMany({
        where: {
          expires: {
            lt: new Date()
          }
        }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}; 