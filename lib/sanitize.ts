import DOMPurify from 'isomorphic-dompurify';

// Create proper type definitions for DOMPurify
type DOMPurifyConfig = {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  ALLOW_DATA_ATTR?: boolean;
  FORBID_TAGS?: string[];
  FORBID_ATTR?: string[];
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @param options - Optional DOMPurify configuration
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string, options?: DOMPurifyConfig): string {
  if (!html) return '';
  
  const defaultConfig: DOMPurifyConfig = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
    FORBID_ATTR: ['style', 'onload', 'onerror', 'onclick'],
  };

  const config = { ...defaultConfig, ...options };
  
  try {
    // Convert TrustedHTML to string
    const sanitized = DOMPurify.sanitize(html, config);
    return typeof sanitized === 'string' ? sanitized : sanitized.toString();
  } catch (error) {
    console.error('Error sanitizing HTML:', error);
    // Return empty string on error to be safe
    return '';
  }
}

/**
 * Sanitize text content by removing all HTML tags
 * @param text - The text to sanitize
 * @returns Plain text string
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  try {
    const sanitized = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
    return typeof sanitized === 'string' ? sanitized : sanitized.toString();
  } catch (error) {
    console.error('Error sanitizing text:', error);
    return '';
  }
}

/**
 * Sanitize tweet content with Twitter-specific rules
 * @param tweetHtml - Tweet HTML content
 * @returns Sanitized tweet HTML
 */
export function sanitizeTweetHtml(tweetHtml: string): string {
  if (!tweetHtml) return '';
  
  const tweetConfig: DOMPurifyConfig = {
    ALLOWED_TAGS: ['a', 'br', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['style', 'onload', 'onerror', 'onclick', 'javascript:'],
  };
  
  try {
    const sanitized = DOMPurify.sanitize(tweetHtml, tweetConfig);
    return typeof sanitized === 'string' ? sanitized : sanitized.toString();
  } catch (error) {
    console.error('Error sanitizing tweet HTML:', error);
    return '';
  }
} 