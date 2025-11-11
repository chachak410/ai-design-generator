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