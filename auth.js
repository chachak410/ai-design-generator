/**
 * Root Auth Wrapper (Fallback)
 * 
 * This file provides a fallback Auth object in case the feature-rich
 * js/features/auth/auth.js is not loaded. It will only define Auth
 * if no other Auth implementation exists.
 * 
 * The preferred implementation is in js/features/auth/auth.js
 */

(function() {
  'use strict';

  // Only define Auth if it doesn't already exist (avoid overwriting the feature-rich implementation)
  if (typeof window.Auth !== 'undefined') {
    console.log('[auth.js] Auth already defined, skipping fallback');
    return;
  }

  console.log('[auth.js] Defining fallback Auth wrapper');

  window.Auth = {
    async login() {
      var emailEl = document.getElementById('login-email');
      var passwordEl = document.getElementById('login-password');
      
      if (!emailEl || !passwordEl) {
        console.error('[Auth] Login form elements not found');
        return;
      }
      
      var email = emailEl.value;
      var password = passwordEl.value;

      // Guard AppState usage
      if (!window.AppState || !window.AppState.auth) {
        console.error('[Auth] AppState.auth not available');
        if (window.UI) {
          UI.showMessage('login-msg', 'Authentication service not available. Please reload the page.', 'error');
        }
        return;
      }

      try {
        if (window.UI) {
          UI.showMessage('login-msg', 'Signing in...', 'info');
        }
        await window.AppState.auth.signInWithEmailAndPassword(email, password);
        if (window.UI) {
          UI.hideMessage('login-msg');
        }
      } catch (err) {
        console.error('[Auth] Login error:', err);
        var errorMessage = 'Login failed. Please try again.';
        if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/wrong-password') {
          errorMessage = 'Incorrect email or password.';
        } else if (err.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email.';
        }
        if (window.UI) {
          UI.showMessage('login-msg', errorMessage, 'error');
        }
      }
    },

    async logout() {
      // Guard AppState usage
      if (!window.AppState || !window.AppState.auth) {
        console.error('[Auth] AppState.auth not available');
        return;
      }

      try {
        await window.AppState.auth.signOut();
      } catch (err) {
        console.error('[Auth] Logout error:', err);
        alert('Logout failed: ' + err.message);
      }
    },

    async resetPassword() {
      var email = prompt('Enter your email address:');
      if (!email) return;

      // Guard AppState usage
      if (!window.AppState || !window.AppState.auth) {
        console.error('[Auth] AppState.auth not available');
        alert('Authentication service not available. Please reload the page.');
        return;
      }

      try {
        await window.AppState.auth.sendPasswordResetEmail(email);
        alert('Password reset email sent! Check your inbox.');
      } catch (err) {
        console.error('[Auth] Password reset error:', err);
        alert('Error: ' + err.message);
      }
    }
  };
})();
