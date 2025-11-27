/**
 * Admin Configuration Module
 * 
 * Parses the ADMIN_EMAILS environment variable and provides utilities
 * to check if a user email belongs to an admin.
 * 
 * Usage:
 *   const { isAdminByEmail, getAdminEmails } = require('./config/admin');
 *   if (isAdminByEmail('user@example.com')) { ... }
 */

/**
 * Parse the ADMIN_EMAILS environment variable.
 * Expected format: comma-separated list of email addresses.
 * Example: "admin1@example.com,admin2@example.com"
 * 
 * @returns {Set<string>} A Set of normalized (lowercase) admin email addresses
 */
function parseAdminEmails() {
  const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
  
  if (!adminEmailsEnv.trim()) {
    console.log('[Admin Config] No ADMIN_EMAILS configured. No admin accounts will be recognized.');
    return new Set();
  }
  
  const emails = adminEmailsEnv
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => {
      // Basic email validation
      const isValid = email.length > 0 && email.includes('@');
      if (!isValid && email.length > 0) {
        console.warn(`[Admin Config] Invalid email format skipped: "${email}"`);
      }
      return isValid;
    });
  
  if (emails.length > 0) {
    console.log(`[Admin Config] Loaded ${emails.length} admin email(s).`);
  } else {
    console.log('[Admin Config] ADMIN_EMAILS was set but contained no valid emails.');
  }
  
  return new Set(emails);
}

// Parse admin emails on module load
const adminEmails = parseAdminEmails();

/**
 * Check if the given email belongs to an admin.
 * 
 * @param {string} email - The email address to check
 * @returns {boolean} True if the email is an admin, false otherwise
 */
function isAdminByEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return adminEmails.has(email.trim().toLowerCase());
}

/**
 * Get the list of admin emails (for debugging/logging purposes).
 * 
 * @returns {string[]} Array of admin email addresses
 */
function getAdminEmails() {
  return Array.from(adminEmails);
}

/**
 * Reload admin emails from environment (useful for testing).
 * This clears the current set and re-parses from env.
 * 
 * @returns {Set<string>} The newly parsed admin emails
 */
function reloadAdminEmails() {
  adminEmails.clear();
  const newEmails = parseAdminEmails();
  newEmails.forEach(email => adminEmails.add(email));
  return adminEmails;
}

module.exports = {
  isAdminByEmail,
  getAdminEmails,
  reloadAdminEmails
};
