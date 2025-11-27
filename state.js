// js/core/state.js
// Global application state with safe Firebase initialization

(function() {
  'use strict';
  
  // Safe Firebase initialization - guard against missing SDKs or config
  var firebaseAuth = null;
  var firebaseDb = null;

  try {
    // Check if Firebase SDK and AppConfig are available
    if (typeof firebase !== 'undefined' && 
        typeof window.AppConfig !== 'undefined' && 
        window.AppConfig.firebase) {
      
      // Initialize Firebase only if not already initialized
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(window.AppConfig.firebase);
        console.log('[state.js] Firebase initialized successfully');
      } else {
        console.log('[state.js] Firebase already initialized');
      }
      
      // Get auth and firestore references
      if (typeof firebase.auth === 'function') {
        firebaseAuth = firebase.auth();
      }
      if (typeof firebase.firestore === 'function') {
        firebaseDb = firebase.firestore();
      }
    } else {
      console.warn('[state.js] Firebase SDK or AppConfig not available. Auth/DB will be null.');
    }
  } catch (e) {
    console.error('[state.js] Error initializing Firebase:', e);
  }

  // Create AppState with safe defaults
  window.AppState = {
    auth: firebaseAuth,
    db: firebaseDb,
    currentUser: null,
    userRole: null,
    isAdmin: false, // Admin flag - set based on email or role
    userProductName: null,
    userTemplates: [],
    userSpecs: {},
    selectedSpecs: {},
    generationCount: 0,
    feedbackVector: null,
    badSelections: 0,
    maxBadSelections: 10,
    creditLimit: 20,
    clientNeedsSetup: false,
    // Store the product selected by user from dropdown
    selectedProduct: null,
    allowedProducts: []
  };

  console.log('[state.js] AppState created with auth:', !!firebaseAuth, 'db:', !!firebaseDb);
})();