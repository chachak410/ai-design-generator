import { analyzeTwoImages } from '../src/imageAnalyzer.js';

test('analyzeTwoImages returns a combined description', async () => {
  const mockFile1 = new File([''], 'sunset.jpg', { type: 'image/jpeg' });
  const mockFile2 = new File([''], 'night.jpg', { type: 'image/jpeg' });

  const result = await analyzeTwoImages(mockFile1, mockFile2);
  
  expect(result).toHaveProperty('description');
  expect(typeof result.description).toBe('string');
  expect(result.description).toContain('sunset');
  expect(result.description).toContain('night');
});