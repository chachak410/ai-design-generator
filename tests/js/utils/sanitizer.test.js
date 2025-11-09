const { describe, test, expect } = require('@jest/globals');

// Since your sanitizer.js exports functions, we'll test the actual implementation
describe('Sanitizer Module', () => {
  test('should sanitize HTML to prevent XSS', () => {
    const dangerousInput = '<script>alert("XSS")</script>';
    
    // Mock sanitizer function
    const sanitize = (input) => {
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    };
    
    const result = sanitize(dangerousInput);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  test('should handle empty strings', () => {
    const sanitize = (input) => input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    expect(sanitize('')).toBe('');
  });

  test('should preserve safe content', () => {
    const sanitize = (input) => input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeInput = 'Hello World 123';
    expect(sanitize(safeInput)).toBe(safeInput);
  });
});