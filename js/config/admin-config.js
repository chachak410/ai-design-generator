/**
 * Admin Configuration Module (Browser)
 * 
 * Provides utilities to check if a user email belongs to an admin.
 * Admin emails are configured via AppConfig.adminEmails.
 * 
 * Usage:
 *   if (AdminConfig.isAdminByEmail(user.email)) { ... }
 */

window.AdminConfig = (function() {
  'use strict';
  
  /**
   * Get the list of admin emails from configuration.
   * Reads from AppConfig.adminEmails (array) or parses a comma-separated string.
   * 
   * @returns {Set<string>} A Set of normalized (lowercase) admin email addresses
   */
  function getAdminEmailSet() {
    let adminEmails = [];
    
    // Check AppConfig.adminEmails
    if (typeof window.AppConfig !== 'undefined' && window.AppConfig.adminEmails) {
      const configEmails = window.AppConfig.adminEmails;
      
      if (Array.isArray(configEmails)) {
        adminEmails = configEmails;
      } else if (typeof configEmails === 'string') {
        // Parse comma-separated string
        adminEmails = configEmails.split(',').map(e => e.trim());
      }
    }
    
    // Email validation regex pattern
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Normalize to lowercase and filter valid emails using proper regex
    const normalized = adminEmails
      .filter(function(email) {
        return typeof email === 'string' && emailRegex.test(email);
      })
      .map(email => email.toLowerCase().trim());
    
    return new Set(normalized);
  }
  
  /**
   * Check if the given email belongs to an admin.
   * Also checks for 'master' or 'admin' role in user data if available.
   * 
   * @param {string} email - The email address to check
   * @param {object} [userData] - Optional user data object with role field
   * @returns {boolean} True if the email is an admin, false otherwise
   */
  function isAdminByEmail(email, userData) {
    // Check if user has admin or master role
    if (userData && (userData.role === 'master' || userData.role === 'admin')) {
      return true;
    }
    
    // Check email against configured admin emails
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

  // Cache for admin email Set - invalidated when source changes
  let _cachedAdminEmailSet = null;
  let _cachedSource = null;

  /**
   * Get a Set of admin emails for O(1) lookups.
   * Uses caching to avoid repeated array operations.
   * @returns {Set<string>} Set of normalized admin email addresses
   */
  function getAdminEmailSet() {
    // Determine current source to detect cache invalidation
    const currentSource = typeof window.ADMIN_EMAILS !== 'undefined' ? 'window' :
                          (typeof window.AppConfig !== 'undefined' && Array.isArray(window.AppConfig.adminEmails)) ? 'config' :
                          'localStorage';
    
    // Return cached set if source hasn't changed
    if (_cachedAdminEmailSet && _cachedSource === currentSource) {
      return _cachedAdminEmailSet;
    }
    
    // Rebuild cache
    const adminEmails = getAdminEmails();
    _cachedAdminEmailSet = new Set(adminEmails);
    _cachedSource = currentSource;
    
    return _cachedAdminEmailSet;
  }

  /**
   * Check if a given email is an admin email.
   * Uses Set for O(1) lookup performance.
   * @param {string} email - The email address to check
   * @returns {boolean} True if the email is in the admin list
   */
  function isAdminByEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    const adminEmails = getAdminEmailSet();
    return adminEmails.has(email.toLowerCase().trim());
  }
  
  /**
   * Get the list of configured admin emails.
   * 
   * @returns {string[]} Array of admin email addresses
   */
  function getAdminEmails() {
    return Array.from(getAdminEmailSet());
  }
  
  /**
   * Check if admin configuration is properly set up.
   * 
   * @returns {boolean} True if at least one admin email is configured
   */
  function isConfigured() {
    return getAdminEmailSet().size > 0;
  }
  
  // Log configuration status on load
  if (typeof window !== 'undefined') {
    const emails = getAdminEmailSet();
    if (emails.size > 0) {
      console.log('[AdminConfig] Loaded ' + emails.size + ' admin email(s).');
    } else {
      console.log('[AdminConfig] No admin emails configured. Add adminEmails to AppConfig.');
    }
  }
  
  return {
    isAdminByEmail: isAdminByEmail,
    getAdminEmails: getAdminEmails,
    isConfigured: isConfigured
  };
    const normalizedEmail = email.toLowerCase().trim();
    const adminEmailSet = getAdminEmailSet();
    
    const isAdmin = adminEmailSet.has(normalizedEmail);
    
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
