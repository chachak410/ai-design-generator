/**
 * Validation Utilities
 * Form and input validation
 */
const Validation = {
  isEmail(value) {
    const v = String(value ?? '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  },
  isNotEmpty(value) {
    return String(value ?? '').trim().length > 0;
  },
  validateLogin(email, password) {
    return this.isEmail(email) && this.isNotEmpty(password);
  }
};
window.Validation = Validation;
window.ValidationUtils = Validation;

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('preferred-language', lang);
  updatePageLanguage();
}

function updatePageLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLang]?.[key]) {
      el.textContent = translations[currentLang][key];
    }
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('preferred-language') || 'zh';
  setLang(saved);
});

// Expose globally
window.setLang = setLang;
window.updatePageLanguage = updatePageLanguage;