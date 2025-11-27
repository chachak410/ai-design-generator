/**
 * API /me Endpoint Example
 * 
 * This module provides an Express route handler for the /api/me endpoint.
 * It returns the current user's role from req.user or session.
 * 
 * Integration:
 *   // In your main server.js:
 *   const apiMeHandler = require('./server/api/me');
 *   app.get('/api/me', apiMeHandler);
 * 
 * Or if using Express Router:
 *   const router = require('express').Router();
 *   const apiMeHandler = require('./server/api/me');
 *   router.get('/me', apiMeHandler);
 *   app.use('/api', router);
 * 
 * Expected req.user structure (from your auth middleware):
 *   req.user = {
 *     uid: 'user-id',
 *     email: 'user@example.com',
 *     role: 'client' | 'master' | 'admin'
 *   }
 * 
 * Or from session:
 *   req.session.user = { ... }
 * 
 * Response format:
 *   { role: 'client' | 'master' | 'admin', email?: string, uid?: string }
 *   or { role: null } if not authenticated
 * 
 * TODO: Add your authentication middleware before this route to populate req.user
 *       For Firebase Auth, you might use firebase-admin to verify ID tokens
 */

/**
 * Express route handler for GET /api/me
 * Returns the current user's role and basic info
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function apiMeHandler(req, res) {
  try {
    // Try to get user from various sources
    const user = req.user || (req.session && req.session.user) || null;

    if (!user) {
      // User not authenticated
      return res.status(401).json({
        role: null,
        message: 'Not authenticated'
      });
    }

    // Return user info with role
    // Only include safe, non-sensitive fields
    // Note: If user.role is not set, we return null to indicate the role needs to be
    // explicitly set rather than defaulting to any role. This prevents unauthorized access
    // if a user somehow bypasses authentication but req.user is set without a role.
    return res.json({
      role: user.role || null,
      email: user.email || null,
      uid: user.uid || user.id || null,
      // Include display name if available
      displayName: user.displayName || user.name || null
    });
  } catch (error) {
    console.error('[API /me] Error:', error);
    return res.status(500).json({
      role: null,
      error: 'Internal server error'
    });
  }
}

/**
 * Middleware to extract user from Firebase Auth token
 * 
 * TODO: This is a placeholder. Implement with firebase-admin if using Firebase Auth.
 * 
 * Usage:
 *   app.use(firebaseAuthMiddleware);
 *   app.get('/api/me', apiMeHandler);
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function firebaseAuthMiddleware(req, res, next) {
  // TODO: Implement Firebase Auth token verification
  // Example implementation:
  //
  // const authHeader = req.headers.authorization;
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   // No token provided - user is not authenticated
  //   return next();
  // }
  //
  // try {
  //   const token = authHeader.split('Bearer ')[1];
  //   const admin = require('firebase-admin');
  //   const decodedToken = await admin.auth().verifyIdToken(token);
  //   
  //   // Get user document from Firestore to get role
  //   const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
  //   const userData = userDoc.exists ? userDoc.data() : {};
  //   
  //   req.user = {
  //     uid: decodedToken.uid,
  //     email: decodedToken.email,
  //     role: userData.role || 'client',
  //     displayName: userData.name || decodedToken.name || null
  //   };
  // } catch (error) {
  //   console.warn('[Firebase Auth] Token verification failed:', error.message);
  //   // Continue without setting req.user - user is treated as unauthenticated
  // }

  next();
}

/**
 * Protected route middleware for master-only pages
 * 
 * TODO: Use this middleware on routes that should only be accessible by master users
 * 
 * Usage:
 *   app.get('/admin/clients', requireMaster, clientsHandler);
 *   app.post('/api/templates/create', requireMaster, createTemplateHandler);
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireMaster(req, res, next) {
  const user = req.user || (req.session && req.session.user);

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (user.role !== 'master' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Master role required.' });
  }

  next();
}

/**
 * Protected route middleware for authenticated users
 * 
 * Usage:
 *   app.get('/api/profile', requireAuth, profileHandler);
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAuth(req, res, next) {
  const user = req.user || (req.session && req.session.user);

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  next();
}

// Export the handler and middleware
module.exports = apiMeHandler;
module.exports.apiMeHandler = apiMeHandler;
module.exports.firebaseAuthMiddleware = firebaseAuthMiddleware;
module.exports.requireMaster = requireMaster;
module.exports.requireAuth = requireAuth;
