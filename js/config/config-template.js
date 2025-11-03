<!-- Firebase SDKs -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

<!-- EmailJS -->
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>

<!-- 🔥 ADD THIS LINE - Config MUST load before everything else! -->
<script src="js/config/config.js"></script>

<!-- Core modules -->
<script src="js/core/state.js"></script>
<script src="js/core/i18n.js"></script>

<!-- Utils -->
<script src="js/utils/ui.js"></script>

<!-- Feature modules -->
<script src="js/features/auth/auth.js"></script>
<!-- ...rest of your scripts... -->

<!-- Main entry point (LAST!) -->
<script src="js/core/main.js"></script>

const AppConfig = {
  firebase: {
    apiKey: "AIzaSyDm0BXeMexwXXwMhF_vR0AULj8w-BJdgTc",
    authDomain: "ai-design-generator-e04ad.firebaseapp.com",
    projectId: "ai-design-generator-e04ad",
    storageBucket: "ai-design-generator-e04ad.firebasestorage.app",
    messagingSenderId: "490733095592",
    appId: "1:490733095592:web:f4a73d03e8de95fd42e2c3"
  },
  
  emailjs: {
    serviceId: "service_xxxxxxx",
    templateId: "template_xxxxxxx",
    publicKey: "YOUR_PUBLIC_KEY"
  },

  api: {
    stability: "YOUR_STABILITY_AI_API_KEY"
  }
};