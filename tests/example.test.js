const { describe, test, expect } = require('@jest/globals');

describe('Example Test Suite', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should test string operations', () => {
    const str = 'Hello World';
    expect(str).toContain('World');
    expect(str.length).toBe(11);
  });

  test('should test array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr).toHaveLength(5);
    expect(arr).toContain(3);
  });
});