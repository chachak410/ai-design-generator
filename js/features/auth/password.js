class Password {
    constructor(auth) {
        this.auth = auth;
    }

    async sendResetEmail(email) {
        const sanitizedEmail = Sanitizer.sanitizeEmail(email);
        if (!sanitizedEmail || !Sanitizer.isValidEmail(sanitizedEmail)) {
            return {
                success: false,
                error: window.i18n.t('generationError')
            };
        }
        try {
            await this.auth.sendPasswordResetEmail(sanitizedEmail);
            return {
                success: true,
                message: window.i18n.t('resetPassword')
            };
        } catch (err) {
            let errorMessage = window.i18n.t('generationFailed');
            if (err.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email.';
            } else if (err.code === 'auth/too-many-requests') {
                errorMessage = 'Too many requests. Please try again later.';
            }
            return { success: false, error: errorMessage };
        }
    }

    async changePassword(currentPassword, newPassword, confirmPassword) {
        if (newPassword !== confirmPassword) {
            return { success: false, error: 'New passwords do not match.' };
        }
        if (!Sanitizer.isValidPassword(newPassword)) {
            return { success: false, error: 'Password must be at least 6 characters.' };
        }
        try {
            const user = this.auth.currentUser;
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            return {
                success: true,
                message: 'Password updated successfully!'
            };
        } catch (err) {
            let errorMessage = 'Failed to change password.';
            if (err.code === 'auth/wrong-password') {
                errorMessage = 'Current password is incorrect.';
            } else if (err.code === 'auth/weak-password') {
                errorMessage = 'New password is too weak.';
            }
            return { success: false, error: errorMessage };
        }
    }
}

window.Password = new Password(AppState.auth);
window.resetPassword = Password.sendResetEmail.bind(window.Password);