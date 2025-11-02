// js/features/generation.js: AI Image Generation, Prompts, Rendering
import * as UI from './ui.js';
import * as Records from './records.js';  // For saving generations
import { config } from '../../config.js';  // For API keys

// API Keys (from config)
const STABILITY_API_KEY = config.stabilityApiKey;
const HUGGINGFACE_API_KEY = config.huggingfaceApiKey;

// Globals (shared)
let currentUser;
let userProductName;
let userSpecs;
let selectedSpecs;
let generationCount;
let currentLanguage;

// Prompt Sanitizer
export function sanitizePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    console.error('Invalid prompt:', prompt);
    return '';
  }
  const sanitized = prompt
    .replace(/[\n\r\t"']/g, ' ')
    .replace(/[{}[\]]/g, ' ')
    .replace(/[%()<>]/g, ' ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 1000);
  console.log('Sanitized Prompt:', sanitized);
  return sanitized;
}

// Pollinations AI (Primary, with retries)
export async function generateWithPollinations(prompt, seed, width = 768, height = 1024, retries = 6) {
  try {
    const sanitizedPrompt = sanitizePrompt(prompt);
    if (!sanitizedPrompt) throw new Error('Prompt is empty or invalid');
    
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(sanitizedPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux&safe=true`;
    console.log('Pollinations AI URL:', url);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(url, { 
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.warn(`Pollinations status: ${response.status}`);
      if ((response.status === 502 || response.status === 524) && retries > 0) {
        const delay = 3000 * (7 - retries);
        console.warn(`Retrying Pollinations in ${delay/1000}s... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateWithPollinations(prompt, seed, width, height, retries - 1);
      }
      throw new Error(`Pollinations error: ${response.status}`);
    }
    
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('Empty image blob');
    
    return { provider: 'Pollinations AI', url: URL.createObjectURL(blob) };
  } catch (err) {
    console.error('Pollinations full error:', err);
    return null;
  }
}

// Stability AI (Backup)
export async function generateWithStability(prompt, seed, width = 1024, height = 1024, retries = 3) {
  try {
    const sanitizedPrompt = sanitizePrompt(prompt);
    if (!sanitizedPrompt) throw new Error('Prompt is empty or invalid');
    
    const payload = {
      text_prompts: [{ text: sanitizedPrompt, weight: 1 }],
      cfg_scale: 7,
      height: height,
      width: width,
      steps: 30,
      seed: seed
    };
    
    const jsonString = JSON.stringify(payload);
    console.log('Stability AI Payload:', jsonString);
    
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${STABILITY_API_KEY}`
      },
      body: jsonString
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stability Raw Response:', errorText);
      throw new Error(`Stability error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    if (data.artifacts && data.artifacts.length > 0) {
      return { provider: 'Stability AI', url: `data:image/png;base64,${data.artifacts[0].base64}` };
    }
    throw new Error('No images from Stability');
  } catch (err) {
    console.error('Stability error:', err);
    return null;
  }
}

// Hugging Face (Backup)
export async function generateWithHuggingFace(prompt, seed, width = 1024, height = 1024, retries = 3) {
  if (!HUGGINGFACE_API_KEY || HUGGINGFACE_API_KEY.includes('YOUR')) return null;
  try {
    const sanitizedPrompt = sanitizePrompt(prompt);
    if (!sanitizedPrompt) throw new Error('Prompt is empty or invalid');
    
    const payload = {
      inputs: sanitizedPrompt,
      parameters: {
        width: width,
        height: height,
        seed: seed,
        num_inference_steps: 28,
        guidance_scale: 7.0,
        negative_prompt: 'low quality, blurry, distorted'
      }
    };
    
    const jsonString = JSON.stringify(payload);
    console.log('Hugging Face payload:', jsonString);
    
    const response = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`
      },
      body: jsonString
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face Raw Response:', errorText);
      throw new Error(`Hugging Face error: ${response.status} - ${errorText}`);
    }
    
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('Empty response');
    return { provider: 'Hugging Face', url: URL.createObjectURL(blob) };
  } catch (err) {
    console.error('Hugging Face error:', err);
    return null;
  }
}

// Main Generation Flow (updated to use Records.saveGeneration)
export async function generateImages(selectedTemplates) {
  if (!currentUser) {
    UI.showMessage('template-status', 'Please sign in.', 'error');
    return;
  }
  if (!userProductName || userProductName.trim().length < 2) {
    UI.showMessage('template-status', 'Product name required. <a href="#" onclick="UI.showPage(\'account-page\', userRole); return false;">Update now</a>', 'error');
    UI.showPage('account-page', userRole);
    return;
  }
  if (selectedTemplates.length === 0) {
    UI.showMessage('template-status', 'Please select at least one template.', 'error');
    return;
  }
  if (generationCount >= 20) {
    UI.showMessage('template-status', 'Maximum generation limit reached.', 'error');
    return;
  }

  let extra = '';
  if (userSpecs) {
    extra = Object.entries(selectedSpecs)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    if (extra) extra = ', ' + extra;
  }
  let basePrompt = '';
  if (currentLanguage === 'zh') {
    basePrompt = `一个精美的${userProductName}产品设计图，${selectedTemplates.join('、')}风格${extra}，高质量，细节丰富，专业级`;
  } else if (currentLanguage === 'yue') {
    basePrompt = `一個精美嘅${userProductName}產品設計圖，${selectedTemplates.join('、')}風格${extra}，高質量，細節豐富，專業級`;
  } else {
    basePrompt = `A beautiful product design for ${userProductName}, ${selectedTemplates.join(', ')} style${extra}, high quality, detailed, professional`;
  }

  UI.showMessage('template-status', `Generating with Pollinations AI...`, 'info');
  const generateBtn = document.getElementById('generate-images-btn');
  if (generateBtn) generateBtn.disabled = true;

  const generators = { pollinations: generateWithPollinations, stability: generateWithStability, huggingface: generateWithHuggingFace };
  const dimensions = { pollinations: { width: 768, height: 1024 }, stability: { width: 1024, height: 1024 }, huggingface: { width: 1024, height: 1024 } };

  const orderedLLMs = ['pollinations'];
  const selectedLLM = document.getElementById('llm-select')?.value;
  if (selectedLLM && selectedLLM !== 'pollinations') orderedLLMs.push(selectedLLM);
  orderedLLMs.push(...['stability', 'huggingface'].filter(llm => llm !== selectedLLM));

    let images = [];
    let attempts = 0;
    const maxAttempts = 10;
    const seed = Date.now();
  
    while (images.length < 2 && attempts < maxAttempts && generationCount < 20) {
      const llm = orderedLLMs[attempts % orderedLLMs.length];
      attempts++;
    }
  }