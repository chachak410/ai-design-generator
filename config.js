// Central app configuration (browser-friendly)
// This file intentionally defines `window.AppConfig` so pages that load
// `config.js` (e.g. setup.html) have access to the same configuration.

window.AppConfig = {
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