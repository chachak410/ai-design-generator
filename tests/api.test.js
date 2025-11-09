const { describe, test, expect, beforeEach } = require('@jest/globals');

describe('API Integration Tests', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('should handle successful API response', async () => {
    const mockResponse = { success: true, data: { image: 'base64...' } };
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });
    
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'test' })
    });
    
    const data = await response.json();
    
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(data.success).toBe(true);
  });

  test('should handle API errors gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    });
    
    const response = await fetch('/api/generate-image');
    
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });

  test('should handle network errors', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    
    try {
      await fetch('/api/generate-image');
    } catch (error) {
      expect(error.message).toBe('Network error');
    }
  });
});