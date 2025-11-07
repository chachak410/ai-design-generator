<!DOCTYPE html>
<html>
<head>
    <!-- ...existing code... -->
</head>
<body>
    <!-- ...existing code... -->
    
    <!-- Firebase SDKs (Add before other scripts) -->
    <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-analytics-compat.js"></script>
    
    <!-- Configuration file -->
    <script src="js/config/config.js"></script>
    
    <!-- Firebase initialization -->
    <script src="js/firebase.js"></script>
    
    <!-- Your other scripts -->
    <script src="js/main.js"></script>
</body>
</html>

// Initialize Firebase
function init() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(AppConfig.firebase);
            firebase.analytics();
        }
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

init();

const AppConfig = {
  firebase: {
    apiKey: "AIzaSyC0P-rmy6ZiKCBnivZQBahKWaPcqg4nDnU",
    authDomain: "image-generator-c51e2.firebaseapp.com",
    projectId: "image-generator-c51e2",
    storageBucket: "image-generator-c51e2.firebasestorage.app",
    messagingSenderId: "222706847155",
    appId: "1:222706847155:web:824453eca61077f5f0cfc6",
    measurementId: "G-JSK1FHFEMT"
  },
  
  emailjs: {
    serviceId: "service_sq0910p",
    templateId: "template_6cykjb4",
    publicKey: "DjaueAhkuIzk5gj2x"
  },

  api: {
    stability: "sk-RwqmAp2Q9nr3RgoLh8g04tgrprjlGhrDMYD8JGv1IxF9WnLQ",
    huggingface: "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"
  }
};