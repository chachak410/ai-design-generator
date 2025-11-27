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
    
    // Normalize to lowercase and filter valid emails
    const normalized = adminEmails
      .filter(email => typeof email === 'string' && email.includes('@'))
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
})();
