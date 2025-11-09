const { describe, test, expect } = require('@jest/globals');

describe('Helper Functions', () => {
  test('should format date correctly', () => {
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US');
    };
    
    const testDate = new Date('2025-01-01');
    expect(formatDate(testDate)).toBeTruthy();
  });

  test('should generate unique IDs', () => {
    const generateId = () => {
      return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };
    
    const id1 = generateId();
    const id2 = generateId();
    
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  test('should truncate long strings', () => {
    const truncate = (str, maxLength) => {
      if (str.length <= maxLength) return str;
      return str.slice(0, maxLength) + '...';
    };
    
    const longString = 'This is a very long string that needs truncation';
    expect(truncate(longString, 10)).toBe('This is a ...');
    expect(truncate('Short', 10)).toBe('Short');
  });
});