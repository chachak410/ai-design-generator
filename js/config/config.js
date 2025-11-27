// Central app configuration (browser-friendly)
// This file intentionally defines `window.AppConfig` so pages that load
// `config.js` (e.g. setup.html) have access to the same configuration.

window.AppConfig = {
  firebase: {
    apiKey: "AIzaSyC0P-rmy6ZiKCBnivZQBahKWaPcqg4nDnU",
    authDomain: "image-generator-c51e2.firebaseapp.com", // ✅ Keep this
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
  },

  // Admin Configuration
  // List of admin email addresses. Users with these emails will have admin privileges.
  // Admin users can access: Template Creation, Client Management, Support Responses
  // Add emails as an array: ["admin1@example.com", "admin2@example.com"]
  // Or as comma-separated string: "admin1@example.com,admin2@example.com"
  adminEmails: [
    "langtechgroup5@gmail.com"
  ]
};