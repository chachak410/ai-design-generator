const { describe, test, expect, beforeEach } = require('@jest/globals');

describe('Authentication Tests', () => {
  beforeEach(() => {
    // Reset localStorage before each test
    global.localStorage.clear();
  });

  test('should validate email format', () => {
    const validEmail = 'test@example.com';
    const invalidEmail = 'invalid-email';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    expect(emailRegex.test(validEmail)).toBe(true);
    expect(emailRegex.test(invalidEmail)).toBe(false);
  });

  test('should validate password strength', () => {
    const strongPassword = 'Test123!@#';
    const weakPassword = '123';
    
    const isStrongPassword = (pwd) => pwd.length >= 6;
    
    expect(isStrongPassword(strongPassword)).toBe(true);
    expect(isStrongPassword(weakPassword)).toBe(false);
  });

  test('should store user session', () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    
    global.localStorage.setItem('user', JSON.stringify(mockUser));
    const storedUser = JSON.parse(global.localStorage.getItem('user'));
    
    expect(storedUser).toEqual(mockUser);
  });
});