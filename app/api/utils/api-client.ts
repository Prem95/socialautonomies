/**
 * API Client Utility
 * 
 * Utility functions for making authenticated API requests
 */

/**
 * Get the authentication token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('authToken');
}

/**
 * Set the authentication token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem('authToken', token);
}

/**
 * Remove the authentication token from localStorage
 */
export function removeAuthToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem('authToken');
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  
  const config = {
    ...options,
    headers
  };
  
  const response = await fetch(url, config);
  
  if (!response.ok) {
    // Handle 401 Unauthorized by removing token
    if (response.status === 401) {
      removeAuthToken();
    }
    
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || 'API request failed');
    throw Object.assign(error, { status: response.status, data: errorData });
  }
  
  // For 204 No Content
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

/**
 * Common API request methods
 */
export const api = {
  get: <T = any>(url: string, options?: RequestInit) => 
    apiRequest<T>(url, { method: 'GET', ...options }),
    
  post: <T = any>(url: string, data?: any, options?: RequestInit) => 
    apiRequest<T>(url, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined,
      ...options
    }),
    
  put: <T = any>(url: string, data?: any, options?: RequestInit) => 
    apiRequest<T>(url, { 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined,
      ...options
    }),
    
  delete: <T = any>(url: string, options?: RequestInit) => 
    apiRequest<T>(url, { method: 'DELETE', ...options }),
}; 