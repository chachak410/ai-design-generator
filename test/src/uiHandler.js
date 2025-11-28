// src/uiHandler.js
import { analyzeTwoImages } from './imageAnalyzer.js';

const img1Input = document.getElementById('img1');
const img2Input = document.getElementById('img2');
const preview1 = document.getElementById('preview1');
const preview2 = document.getElementById('preview2');
const resultDiv = document.getElementById('analysisResult');
const descriptionP = document.getElementById('description');

let file1 = null;
let file2 = null;

function updatePreview(input, preview) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => preview.src = e.target.result;
    reader.readAsDataURL(file);
  }
}

async function runAnalysisIfReady() {
  if (file1 && file2) {
    resultDiv.style.display = 'block';
    descriptionP.textContent = 'Analyzing...';
    
    try {
      const result = await analyzeTwoImages(file1, file2);
      descriptionP.textContent = result.description;
    } catch (err) {
      descriptionP.textContent = 'Error during analysis.';
    }
  }
}

img1Input.addEventListener('change', (e) => {
  file1 = e.target.files[0];
  updatePreview(img1Input, preview1);
  runAnalysisIfReady();
});

img2Input.addEventListener('change', (e) => {
  file2 = e.target.files[0];
  updatePreview(img2Input, preview2);
  runAnalysisIfReady();
});