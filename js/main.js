firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
emailjs.init(emailjsConfig.userId);

// In generateWithStability
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${STABILITY_API_KEY}`
};

// In generateWithHuggingFace
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`
};
