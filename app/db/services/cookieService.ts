import { cookieRepository } from '../repositories/cookieRepository';
import { Cookie } from '@prisma/client';
import { CookieCreateInput, CookieUpdateInput, PaginationParams, SortParams } from '../types';
import { DatabaseError } from '../utils/errorHandler';

export const cookieService = {
  /**
   * Create a new cookie
   */
  async createCookie(data: CookieCreateInput): Promise<Cookie> {
    return await cookieRepository.create(data);
  },

  /**
   * Get a cookie by ID
   */
  async getCookieById(cookieId: bigint): Promise<Cookie> {
    const cookie = await cookieRepository.findById(cookieId);
    if (!cookie) {
      throw new DatabaseError(`Cookie with ID ${cookieId} not found`, 'RECORD_NOT_FOUND');
    }
    return cookie;
  },

  /**
   * Get all cookies
   */
  async getAllCookies(params?: PaginationParams & SortParams): Promise<Cookie[]> {
    return await cookieRepository.findAll(params);
  },

  /**
   * Update cookie
   */
  async updateCookie(cookieId: bigint, data: CookieUpdateInput): Promise<Cookie> {
    const cookie = await cookieRepository.findById(cookieId);
    if (!cookie) {
      throw new DatabaseError(`Cookie with ID ${cookieId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await cookieRepository.update(cookieId, data);
  },

  /**
   * Check if cookie exists
   */
  async cookieExists(cookieId: bigint): Promise<boolean> {
    const cookie = await cookieRepository.findById(cookieId);
    return !!cookie;
  }
}; 