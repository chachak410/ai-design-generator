/**
 * Password Management Module
 * Handles password reset and change operations
 */

export class Password {
  constructor(auth) {
    this.auth = auth;
  }

  /**
   * Send password reset email
   */
  async sendResetEmail(email) {
    const sanitizedEmail = Sanitizer.sanitizeEmail(email);

    if (!sanitizedEmail || !Sanitizer.isValidEmail(sanitizedEmail)) {
      return { 
        success: false, 
        error: 'Please enter a valid email address.' 
      };
    }

    try {
      await this.auth.sendPasswordResetEmail(sanitizedEmail);
      return { 
        success: true, 
        message: 'Password reset email sent! Please check your inbox.' 
      };
    } catch (err) {
      let errorMessage = 'Failed to send reset email.';
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Change password for logged-in user
   * (Future feature)
   */
  async changePassword(currentPassword, newPassword, confirmPassword) {
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return { success: false, error: 'New passwords do not match.' };
    }

    // Validate password strength
    if (!Sanitizer.isValidPassword(newPassword)) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    try {
      const user = this.auth.currentUser;
      
      // Re-authenticate user first
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await user.reauthenticateWithCredential(credential);

      // Update password
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