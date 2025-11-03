/**
 * Sanitization Utilities
 * Clean and validate user inputs and prompts
 */

export const Sanitizer = {
  /**
   * Sanitize prompt for AI generation
   * Removes special characters, limits length
   */
  sanitizePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') return '';
    
    return prompt
      .replace(/[\n\r\t"']/g, ' ')      // Remove newlines, tabs, quotes
      .replace(/[{}[\]]/g, ' ')          // Remove brackets
      .replace(/[%()<>]/g, ' ')          // Remove special chars
      .replace(/[^\x20-\x7E]/g, ' ')     // Remove non-ASCII
      .replace(/\s+/g, ' ')              // Collapse whitespace
      .trim()
      .substring(0, 1000);               // Limit to 1000 chars
  },

  /**
   * Sanitize email input
   */
  sanitizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  },

  /**
   * Sanitize text input (names, product names, etc.)
   */
  sanitizeText(text, maxLength = 100) {
    if (!text || typeof text !== 'string') return '';
    return text.trim().substring(0, maxLength);
  },

  /**
   * Validate industry code format
   */
  isValidIndustryCode(code) {
    if (!code || typeof code !== 'string') return false;
    return /^[A-Z0-9]{6}$/.test(code.trim());
  },

  /**
   * Validate email format
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  /**
   * Validate password strength
   */
  isValidPassword(password) {
    if (!password || typeof password !== 'string') return false;
    return password.length >= 6;
  }
};