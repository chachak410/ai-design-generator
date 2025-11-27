/**
 * Admin Configuration Module
 * 
 * Provides configurable admin account management without storing credentials in code.
 * Admin emails can be configured via:
 * 1. window.ADMIN_EMAILS (set before loading this script, e.g., from server-side config)
 * 2. AppConfig.adminEmails (set in config.js for deployment)
 * 3. localStorage 'admin_emails' (for development/testing only)
 * 
 * In production, use server-side configuration or environment variables to inject
 * ADMIN_EMAILS before loading the app.
 * 
 * Example (in HTML before other scripts):
 *   <script>
 *     window.ADMIN_EMAILS = ['langtechgroup5@gmail.com'];
 *   </script>
 * 
 * Or configure via AppConfig in config.js:
 *   window.AppConfig.adminEmails = ['langtechgroup5@gmail.com'];
 */

(function() {
  'use strict';

  /**
   * Get the list of admin emails from configuration.
   * Priority: window.ADMIN_EMAILS > AppConfig.adminEmails > localStorage (dev only)
   * @returns {string[]} Array of admin email addresses (normalized to lowercase)
   */
  function getAdminEmails() {
    let adminEmails = [];

    // Priority 1: Check window.ADMIN_EMAILS (injected by server/deployment)
    if (typeof window.ADMIN_EMAILS !== 'undefined' && Array.isArray(window.ADMIN_EMAILS)) {
      adminEmails = window.ADMIN_EMAILS;
      console.log('[AdminConfig] Using window.ADMIN_EMAILS:', adminEmails.length, 'admin(s) configured');
    }
    // Priority 2: Check AppConfig.adminEmails
    else if (typeof window.AppConfig !== 'undefined' && Array.isArray(window.AppConfig.adminEmails)) {
      adminEmails = window.AppConfig.adminEmails;
      console.log('[AdminConfig] Using AppConfig.adminEmails:', adminEmails.length, 'admin(s) configured');
    }
    // Priority 3: Development only - localStorage (should not be used in production)
    else if (typeof localStorage !== 'undefined') {
      try {
        const storedEmails = localStorage.getItem('admin_emails');
        if (storedEmails) {
          adminEmails = JSON.parse(storedEmails);
          console.log('[AdminConfig] Using localStorage admin_emails (DEV ONLY):', adminEmails.length, 'admin(s)');
        }
      } catch (e) {
        console.warn('[AdminConfig] Failed to parse admin_emails from localStorage:', e);
      }
    }

    // Normalize all emails to lowercase for case-insensitive comparison
    return adminEmails.map(email => (email || '').toLowerCase().trim()).filter(Boolean);
  }

  /**
   * Check if a given email is an admin email.
   * @param {string} email - The email address to check
   * @returns {boolean} True if the email is in the admin list
   */
  function isAdminByEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const adminEmails = getAdminEmails();
    
    const isAdmin = adminEmails.includes(normalizedEmail);
    
    if (isAdmin) {
      console.log('[AdminConfig] ✓ Admin user detected:', normalizedEmail);
    }
    
    return isAdmin;
  }

  /**
   * Check if a user object represents an admin.
   * Checks both the role field and the email against admin list.
   * @param {object} user - User object with email and optionally role
   * @returns {boolean} True if the user is an admin
   */
  function isAdmin(user) {
    if (!user) {
      return false;
    }

    // Check if role is explicitly 'admin' or 'master'
    if (user.role === 'admin' || user.role === 'master') {
      return true;
    }

    // Check if email is in admin list
    const email = user.email || '';
    return isAdminByEmail(email);
  }

  /**
   * Get admin status info for logging/debugging
   * @returns {object} Admin configuration status
   */
  function getAdminConfigStatus() {
    const adminEmails = getAdminEmails();
    return {
      configured: adminEmails.length > 0,
      count: adminEmails.length,
      // Don't expose actual emails in production logs, just count
      source: typeof window.ADMIN_EMAILS !== 'undefined' ? 'window.ADMIN_EMAILS' :
              (typeof window.AppConfig !== 'undefined' && Array.isArray(window.AppConfig.adminEmails)) ? 'AppConfig.adminEmails' :
              'localStorage'
    };
  }

  // Log initial admin configuration status
  const status = getAdminConfigStatus();
  if (status.configured) {
    console.log('[AdminConfig] Admin configuration loaded:', status.count, 'admin(s) from', status.source);
  } else {
    console.log('[AdminConfig] No admin emails configured. To configure admins, set window.ADMIN_EMAILS or AppConfig.adminEmails.');
  }

  // Export to window for global access
  window.AdminConfig = {
    getAdminEmails: getAdminEmails,
    isAdminByEmail: isAdminByEmail,
    isAdmin: isAdmin,
    getAdminConfigStatus: getAdminConfigStatus
  };

})();
