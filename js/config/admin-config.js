/**
 * Admin Configuration Module (Browser)
 * 
 * Provides utilities to check if a user email belongs to an admin.
 * Admin emails can be configured via:
 * 1. window.ADMIN_EMAILS (set before loading this script, e.g., from server-side config)
 * 2. AppConfig.adminEmails (set in config.js for deployment)
 * 3. localStorage 'admin_emails' (for development/testing only)
 * 
 * Usage:
 *   if (AdminConfig.isAdminByEmail(user.email)) { ... }
 *   if (AdminConfig.isAdmin(user)) { ... }
 */

(function() {
  'use strict';

  // Cache for admin email Set
  var _cachedAdminEmailSet = null;
  var _cachedSource = null;

  /**
   * Get the list of admin emails from configuration.
   * Priority: window.ADMIN_EMAILS > AppConfig.adminEmails > localStorage (dev only)
   * @returns {string[]} Array of admin email addresses (normalized to lowercase)
   */
  function getAdminEmailsInternal() {
    var adminEmails = [];

    // Priority 1: Check window.ADMIN_EMAILS (injected by server/deployment)
    if (typeof window.ADMIN_EMAILS !== 'undefined' && Array.isArray(window.ADMIN_EMAILS)) {
      adminEmails = window.ADMIN_EMAILS;
      console.log('[AdminConfig] Using window.ADMIN_EMAILS:', adminEmails.length, 'admin(s) configured');
    }
    // Priority 2: Check AppConfig.adminEmails
    else if (typeof window.AppConfig !== 'undefined' && window.AppConfig.adminEmails) {
      var configEmails = window.AppConfig.adminEmails;
      if (Array.isArray(configEmails)) {
        adminEmails = configEmails;
      } else if (typeof configEmails === 'string') {
        // Parse comma-separated string
        adminEmails = configEmails.split(',').map(function(e) { return e.trim(); });
      }
      console.log('[AdminConfig] Using AppConfig.adminEmails:', adminEmails.length, 'admin(s) configured');
    }
    // Priority 3: Development only - localStorage (should not be used in production)
    else if (typeof localStorage !== 'undefined') {
      try {
        var storedEmails = localStorage.getItem('admin_emails');
        if (storedEmails) {
          adminEmails = JSON.parse(storedEmails);
          console.log('[AdminConfig] Using localStorage admin_emails (DEV ONLY):', adminEmails.length, 'admin(s)');
        }
      } catch (e) {
        console.warn('[AdminConfig] Failed to parse admin_emails from localStorage:', e);
      }
    }

    // Email validation regex pattern
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Normalize to lowercase, trim, and filter valid emails
    return adminEmails
      .filter(function(email) {
        return typeof email === 'string' && emailRegex.test(email.trim());
      })
      .map(function(email) {
        return email.toLowerCase().trim();
      });
  }

  /**
   * Get a Set of admin emails for O(1) lookups.
   * Uses caching to avoid repeated array operations.
   * @returns {Set<string>} Set of normalized admin email addresses
   */
  function getAdminEmailSet() {
    // Determine current source to detect cache invalidation
    var currentSource = typeof window.ADMIN_EMAILS !== 'undefined' ? 'window' :
                        (typeof window.AppConfig !== 'undefined' && window.AppConfig.adminEmails) ? 'config' :
                        'localStorage';
    
    // Return cached set if source hasn't changed
    if (_cachedAdminEmailSet && _cachedSource === currentSource) {
      return _cachedAdminEmailSet;
    }
    
    // Rebuild cache
    var adminEmails = getAdminEmailsInternal();
    _cachedAdminEmailSet = new Set(adminEmails);
    _cachedSource = currentSource;
    
    return _cachedAdminEmailSet;
  }

  /**
   * Check if a given email is an admin email.
   * Uses Set for O(1) lookup performance.
   * @param {string} email - The email address to check
   * @param {object} [userData] - Optional user data object with role field
   * @returns {boolean} True if the email is in the admin list or user has admin role
   */
  function isAdminByEmail(email, userData) {
    // Check if user has admin or master role
    if (userData && (userData.role === 'master' || userData.role === 'admin')) {
      return true;
    }

    if (!email || typeof email !== 'string') {
      return false;
    }
    
    var normalizedEmail = email.toLowerCase().trim();
    var adminEmailSet = getAdminEmailSet();
    var result = adminEmailSet.has(normalizedEmail);
    
    if (result) {
      console.log('[AdminConfig] ✓ Admin user detected:', normalizedEmail);
    }
    
    return result;
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
    var email = user.email || '';
    return isAdminByEmail(email);
  }

  /**
   * Get the list of configured admin emails.
   * @returns {string[]} Array of admin email addresses
   */
  function getAdminEmails() {
    return Array.from(getAdminEmailSet());
  }

  /**
   * Check if admin configuration is properly set up.
   * @returns {boolean} True if at least one admin email is configured
   */
  function isConfigured() {
    return getAdminEmailSet().size > 0;
  }

  /**
   * Get admin status info for logging/debugging
   * @returns {object} Admin configuration status
   */
  function getAdminConfigStatus() {
    var emails = getAdminEmails();
    return {
      configured: emails.length > 0,
      count: emails.length,
      source: typeof window.ADMIN_EMAILS !== 'undefined' ? 'window.ADMIN_EMAILS' :
              (typeof window.AppConfig !== 'undefined' && window.AppConfig.adminEmails) ? 'AppConfig.adminEmails' :
              'localStorage'
    };
  }

  // Log initial admin configuration status
  try {
    var status = getAdminConfigStatus();
    if (status.configured) {
      console.log('[AdminConfig] Admin configuration loaded:', status.count, 'admin(s) from', status.source);
    } else {
      console.log('[AdminConfig] No admin emails configured. To configure admins, set window.ADMIN_EMAILS or AppConfig.adminEmails.');
    }
  } catch (e) {
    console.warn('[AdminConfig] Error checking admin config status:', e);
  }

  // Export to window for global access
  window.AdminConfig = {
    getAdminEmails: getAdminEmails,
    isAdminByEmail: isAdminByEmail,
    isAdmin: isAdmin,
    isConfigured: isConfigured,
    getAdminConfigStatus: getAdminConfigStatus
  };

})();
