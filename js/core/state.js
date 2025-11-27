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
  isAdmin: false, // Admin flag - set based on email or role
  // isAdmin flag indicates if current user has admin privileges (role is 'admin' or 'master', or email is in admin list)
  isAdmin: false,
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