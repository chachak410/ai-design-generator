// js/features/records.js: Load/Display Past Generations & Records
import * as UI from './ui.js';
import * as Gen from './generation.js';

// Globals (shared)
let currentUser;

// Load Past Records (full original logic)
export async function loadRecords() {
  const recordsList = document.getElementById('records-list');
  if (!recordsList) return;
  recordsList.innerHTML = '';
  try {
    const generations = await db.collection('generations')
      .where('userId', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();
    if (generations.empty) {
      UI.showMessage('records-msg', 'No generation records found.', 'info');
      return;
    }
    generations.forEach(doc => {
      const data = doc.data();
      const specsText = data.specifications ? Object.entries(data.specifications).map(([key, value]) => `${key}: ${value}`).join(', ') : '';
      data.images.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class="badge">${data.templates.join(', ')} (${data.productName}${specsText ? ', ' + specsText : ''}) - ${item.provider}</div>
          <img src="${item.url}" alt="Generated image" onload="this.style.opacity=1" style="opacity:0.5; transition:opacity 0.5s"/>
          <button onclick="Gen.downloadImage('${item.url}', ${idx})" class="btn">Download</button>
        `;
        recordsList.appendChild(card);
      });
    });
    UI.hideMessage('records-msg');
  } catch (err) {
    UI.showMessage('records-msg', 'Error loading records: ' + err.message, 'error');
  }
}

// Save Generation (called from generation.js)
export async function saveGeneration(selectedTemplates, selectedSpecs, images) {
  try {
    const generationRef = db.collection('generations').doc();
    await generationRef.set({
      userId: currentUser.uid,
      templates: selectedTemplates,
      productName: userProductName,
      specifications: selectedSpecs,
      images: images.map(item => ({ provider: item.provider, url: item.url })),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Keep only last 3 (original limit)
    const userGenerations = await db.collection('generations')
      .where('userId', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .get();
    userGenerations.docs.slice(3).forEach(doc => doc.ref.delete());

    UI.showMessage('template-status', 'Images generated successfully!', 'success');
  } catch (err) {
    UI.showMessage('template-status', 'Error saving: ' + err.message, 'error');
  }
}

// Set Globals from Auth
export function setGlobals(user, role, industryCode, templates, specs, selected, genCount, productName, lang) {
  currentUser = user;
  userRole = role;
  userIndustryCode = industryCode;
  userTemplates = templates;
  userSpecs = specs;
  selectedSpecs = selected;
  generationCount = genCount;
  userProductName = productName;
  currentLanguage = lang;
}

// Stub for feedback (use in UI/render)
export function submitFeedback(choice) {
  console.log('User chose:', choice);
  // Save to Firebase if needed
}