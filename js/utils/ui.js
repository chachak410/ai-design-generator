const UI = {
    showElement(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('hidden');
            el.style.display = 'block';
        }
    },
    hideElement(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.style.display = 'none';
        }
    },
    showMessage(id, message, type = 'info') {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = message;
            el.className = `message ${type}`;
            el.style.display = 'block';
            setTimeout(() => this.hideElement(id), 5000); // Extended timeout for visibility
        }
    },
    hideMessage(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    },
    showLogin() {
        this.showElement('login-form');
        this.hideElement('register-form');
        this.showElement('switch-to-register');
        this.hideElement('switch-to-login');
        this.hideMessage('login-msg');
    },
    showRegister() {
        this.hideElement('login-form');
        this.showElement('register-form');
        this.hideElement('switch-to-register');
        this.showElement('switch-to-login');
        this.showElement('register-step1');
        this.hideElement('register-step2');
        this.hideElement('register-step3');
        const registerForm = document.getElementById('register-form');
        if (registerForm) registerForm.reset();
        this.hideMessage('register-msg-step1');
        this.hideMessage('register-msg-step2');
        this.hideMessage('register-msg-step3');
    },
    showMainApp() {
        const authContainer = document.getElementById('auth-container');
        const mainApp = document.getElementById('main-app');
        if (authContainer && mainApp) {
            authContainer.style.display = 'none';
            mainApp.classList.add('show');
            mainApp.style.display = 'block';
        }
    },
    showAuth() {
        const authContainer = document.getElementById('auth-container');
        const mainApp = document.getElementById('main-app');
        if (authContainer && mainApp) {
            authContainer.style.display = 'block';
            mainApp.classList.remove('show');
            mainApp.style.display = 'none';
        }
    },
    showPage(pageId, userRole = null) {
        const pages = ['account-page', 'template-page', 'records-page', 'create-account-page', 'client-management-section'];
        if (pageId === 'create-account-page' && userRole !== 'master' && userRole !== 'admin') {
            this.showMessage('template-status', window.i18n.t('pleaseSignIn'), 'error');
            pageId = 'template-page';
        }
        pages.forEach(id => this.hideElement(id));
        this.showElement(pageId);
        if (pageId === 'template-page') {
            Template.loadTemplates(); // Ensure templates are loaded when showing the template page
        }
        if (window.i18n && typeof window.i18n.renderAll === 'function') {
            window.i18n.renderAll();
        }
    },
    checkProductWarning(productName) {
        const warning = document.getElementById('product-warning');
        if (warning) {
            if (productName && productName.trim().length >= 2) {
                this.hideElement('product-warning');
            } else {
                this.showElement('product-warning');
            }
        }
    },
    toggleMasterUI(isMaster) {
        if (isMaster || AppState.userRole === 'admin') {
            this.showElement('create-account-link');
            this.showElement('master-nav-link');
        } else {
            this.hideElement('create-account-link');
            this.hideElement('master-nav-link');
        }
    },
    updateGenerationCounter(count, limit) {
        const counter = document.getElementById('generation-counter');
        if (counter) {
            counter.textContent = `Generations: ${count}/${limit}`;
        }
    }
};

window.UI = UI;