/**
 * Auth Utility Module
 * 
 * Provides client-side helpers for authentication state and user role detection.
 * This module exposes getUserRole() which reads from window.__USER__ or fetches /api/me.
 * 
 * Usage:
 *   const role = await getUserRole(); // Returns 'master', 'client', 'admin', or null
 */

(function() {
  'use strict';

  /**
   * Cache for the fetched user role to avoid repeated API calls
   * @type {string|null}
   */
  var cachedRole = null;
  var rolePromise = null;

  /**
   * Get the current user's role.
   * 
   * Priority order:
   * 1. window.__USER__.role (for SSR injection)
   * 2. window.AppState.userRole (for existing app state)
   * 3. Cached role from previous fetch
   * 4. Fetch from /api/me endpoint
   * 
   * @returns {Promise<string|null>} The user's role ('master', 'client', 'admin') or null if unauthenticated
   */
  async function getUserRole() {
    // 1. Check window.__USER__ (SSR injection)
    if (typeof window !== 'undefined' && window.__USER__ && window.__USER__.role) {
      return window.__USER__.role;
    }

    // 2. Check AppState.userRole (existing app state)
    if (typeof window !== 'undefined' && window.AppState && window.AppState.userRole) {
      return window.AppState.userRole;
    }

    // 3. Return cached role if available
    if (cachedRole !== null) {
      return cachedRole;
    }

    // 4. If we're already fetching, wait for that promise
    if (rolePromise) {
      return rolePromise;
    }

    // 5. Fetch from /api/me endpoint
    rolePromise = fetchUserRole();
    try {
      cachedRole = await rolePromise;
      return cachedRole;
    } finally {
      rolePromise = null;
    }
  }

  /**
   * Fetch user role from the /api/me endpoint
   * @returns {Promise<string|null>} The user's role or null if unauthenticated/error
   */
  async function fetchUserRole() {
    try {
      var response = await fetch('/api/me', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        // User is not authenticated or endpoint doesn't exist
        if (response.status === 401 || response.status === 403) {
          return null;
        }
        console.warn('[AuthUtils] /api/me returned status:', response.status);
        return null;
      }

      var data = await response.json();
      return data.role || null;
    } catch (err) {
      // Network error or endpoint not available
      console.warn('[AuthUtils] Error fetching /api/me:', err.message);
      return null;
    }
  }

  /**
   * Clear the cached role (call this on logout)
   */
  function clearCachedRole() {
    cachedRole = null;
    rolePromise = null;
  }

  /**
   * Check if the current user is authenticated
   * @returns {Promise<boolean>} True if user is authenticated
   */
  async function isAuthenticated() {
    var role = await getUserRole();
    return role !== null;
  }

  /**
   * Check if the current user has master privileges
   * @returns {Promise<boolean>} True if user is master
   */
  async function isMasterUser() {
    var role = await getUserRole();
    return role === 'master';
  }

  /**
   * Check if the current user has admin privileges (master or admin role)
   * @returns {Promise<boolean>} True if user is master or admin
   */
  async function hasAdminPrivileges() {
    var role = await getUserRole();
    return role === 'master' || role === 'admin';
  }

  /**
   * Check if the current user is a client
   * @returns {Promise<boolean>} True if user is client
   */
  async function isClientUser() {
    var role = await getUserRole();
    return role === 'client';
  }

  // Export to global scope (browser)
  if (typeof window !== 'undefined') {
    window.AuthUtils = {
      getUserRole: getUserRole,
      clearCachedRole: clearCachedRole,
      isAuthenticated: isAuthenticated,
      isMasterUser: isMasterUser,
      hasAdminPrivileges: hasAdminPrivileges,
      isClientUser: isClientUser
    };
    // Also export getUserRole directly for convenience
    window.getUserRole = getUserRole;
  }

  // Export for CommonJS (Node.js/tests)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      getUserRole: getUserRole,
      clearCachedRole: clearCachedRole,
      isAuthenticated: isAuthenticated,
      isMasterUser: isMasterUser,
      hasAdminPrivileges: hasAdminPrivileges,
      isClientUser: isClientUser
    };
  }
})();
