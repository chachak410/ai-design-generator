const Sanitizer = {
    sanitizePrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') return '';
        return prompt
            .replace(/[\n\r\t"']/g, ' ')
            .replace(/[{}[\]]/g, ' ')
            .replace(/[%()<>]/g, ' ')
            .replace(/[^\x20-\x7E]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 1000);
    },
    sanitizeEmail(email) {
        if (!email || typeof email !== 'string') return '';
        return email.trim().toLowerCase();
    },
    sanitizeText(text, maxLength = 100) {
        if (!text || typeof text !== 'string') return '';
        return text.trim().substring(0, maxLength);
    },
    isValidIndustryCode(code) {
        if (!code || typeof code !== 'string') return false;
        return /^[A-Z0-9]{6}$/.test(code.trim());
    },
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    },
    isValidPassword(password) {
        if (!password || typeof password !== 'string') return false;
        return password.length >= 6;
    }
};

window.Sanitizer = Sanitizer;
window.sanitizeInput = Sanitizer.sanitizeInput;
window.sanitizePrompt = Sanitizer.sanitizePrompt;