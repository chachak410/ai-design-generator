const Auth = {
    async login() {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        if (!Validation.validateLogin(email, password)) {
            UI.showMessage('login-msg', window.i18n.t('generationError'), 'error');
            return;
        }
        try {
            UI.showMessage('login-msg', window.i18n.t('signIn') + '...', 'info');
            await AppState.auth.signInWithEmailAndPassword(email, password);
            UI.hideMessage('login-msg');
        } catch (err) {
            console.error('Login error:', err);
            let errorMessage = window.i18n.t('generationFailed');
            if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/wrong-password') {
                errorMessage = window.i18n.t('generationError');
            } else if (err.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email.';
            }
            UI.showMessage('login-msg', errorMessage, 'error');
        }
    },

    async logout() {
        try {
            await AppState.auth.signOut();
            UI.showMessage('template-status', window.i18n.t('logout'), 'success');
        } catch (err) {
            console.error('Logout error:', err);
            UI.showMessage('template-status', window.i18n.t('generationError') + ': ' + err.message, 'error');
        }
    },

    async resetPassword() {
        const email = document.getElementById('login-email')?.value;
        if (!email) return;
        try {
            await AppState.auth.sendPasswordResetEmail(email);
            UI.showMessage('login-msg', window.i18n.t('resetPassword'), 'success');
        } catch (err) {
            console.error('Password reset error:', err);
            UI.showMessage('login-msg', window.i18n.t('generationError') + ': ' + err.message, 'error');
        }
    }
};

window.Auth = Auth;