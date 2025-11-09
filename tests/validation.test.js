const { describe, test, expect } = require('@jest/globals');

describe('Input Validation Tests', () => {
  test('should sanitize HTML input', () => {
    const dangerousInput = '<script>alert("XSS")</script>';
    const sanitized = dangerousInput
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    expect(sanitized).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    expect(sanitized).not.toContain('<script>');
  });

  test('should validate image file types', () => {
    const validFiles = ['image.jpg', 'photo.png', 'design.gif'];
    const invalidFiles = ['document.pdf', 'script.js', 'file.exe'];
    
    const isImageFile = (filename) => {
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
    };
    
    validFiles.forEach(file => {
      expect(isImageFile(file)).toBe(true);
    });
    
    invalidFiles.forEach(file => {
      expect(isImageFile(file)).toBe(false);
    });
  });

  test('should validate prompt length', () => {
    const validPrompt = 'Generate a beautiful sunset';
    const tooShort = 'Hi';
    const tooLong = 'a'.repeat(1001);
    
    const isValidPrompt = (prompt) => {
      return prompt.length >= 3 && prompt.length <= 1000;
    };
    
    expect(isValidPrompt(validPrompt)).toBe(true);
    expect(isValidPrompt(tooShort)).toBe(false);
    expect(isValidPrompt(tooLong)).toBe(false);
  });
});