const Helpers = {
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },
    generateIndustryCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return { success: true };
            }
            return { success: false, error: 'Clipboard API not available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    },
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    downloadImage(url, filename = 'image.png') {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};

window.Helpers = Helpers;
window.HelperFunctions = Helpers;