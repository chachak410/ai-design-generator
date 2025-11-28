import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Mock the analyzer
jest.mock('../src/imageAnalyzer.js', () => ({
  analyzeTwoImages: jest.fn(() => 
    Promise.resolve({ description: 'Mocked analysis result' })
  )
}));

const html = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.html'),
  'utf8'
);

const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
global.document = dom.window.document;

const { analyzeTwoImages } = await import('../src/imageAnalyzer.js');
await import('../src/uiHandler.js'); // This attaches listeners

test('shows analysis when both images uploaded', (done) => {
  const img1Input = document.getElementById('img1');
  const img2Input = document.getElementById('img2');
  const resultDiv = document.getElementById('analysisResult');
  const descP = document.getElementById('description');

  // Mock files
  const file1 = new File([''], 'cat.jpg', { type: 'image/jpeg' });
  const file2 = new File([''], 'dog.jpg', { type: 'image/jpeg' });

  // Trigger change events
  Object.defineProperty(img1Input, 'files', { value: [file1] });
  Object.defineProperty(img2Input, 'files', { value: [file2] });

  img1Input.dispatchEvent(new dom.window.Event('change'));
  img2Input.dispatchEvent(new dom.window.Event('change'));

  setTimeout(() => {
    expect(resultDiv.style.display).not.toBe('none');
    expect(descP.textContent).toBe('Mocked analysis result');
    expect(analyzeTwoImages).toHaveBeenCalledWith(file1, file2);
    done();
  }, 1000);
});