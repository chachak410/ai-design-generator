// js/core/state.js

// Initialize Firebase FIRST
if (!firebase.apps.length) {
  firebase.initializeApp(AppConfig.firebase);
}
console.log('Firebase initialized in state.js');

// Now safely create AppState
window.AppState = {
  auth: firebase.auth(),
  db: firebase.firestore(),
  currentUser: null,
  userRole: null,
  userProductName: null,
  userTemplates: [],
  userSpecs: {},
  selectedSpecs: {},
  generationCount: 0,
  feedbackVector: null,
  badSelections: 0,
  maxBadSelections: 10,
  creditLimit: 20,
  // NEW: Store the product selected by user from dropdown
  selectedProduct: null,
  allowedProducts: []
};