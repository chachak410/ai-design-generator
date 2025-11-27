#!/usr/bin/env node
/**
 * Admin Seed Script
 * 
 * Creates or updates an admin account in Firebase Authentication.
 * 
 * IMPORTANT SECURITY NOTES:
 * - NEVER commit passwords to version control
 * - Set ADMIN_SEED_PASSWORD via environment variables or secrets management
 * - This script is intended for initial setup or development environments
 * - In production, use proper secrets management (AWS Secrets Manager, 
 *   GCP Secret Manager, Azure Key Vault, etc.)
 * 
 * Required Environment Variables:
 *   ADMIN_EMAIL - The email for the admin account
 *   ADMIN_SEED_PASSWORD - The password for the admin account (set via secrets!)
 * 
 * Optional Environment Variables:
 *   FIREBASE_SERVICE_ACCOUNT - Path to Firebase service account JSON file
 * 
 * Usage:
 *   # Set password securely (example for bash):
 *   export ADMIN_SEED_PASSWORD='your-secure-password'
 *   node server/scripts/seedAdmin.js
 * 
 *   # Or pass inline (not recommended for production):
 *   ADMIN_SEED_PASSWORD='your-secure-password' node server/scripts/seedAdmin.js
 */

const path = require('path');

// Load environment variables from .env file if it exists
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (e) {
  // dotenv not installed or .env doesn't exist, continue with process.env
  console.log('[Seed] dotenv not available:', e.message || 'unknown error');
}

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const errors = [];
  
  if (!process.env.ADMIN_EMAIL) {
    errors.push('ADMIN_EMAIL is required');
  }
  
  if (!process.env.ADMIN_SEED_PASSWORD) {
    errors.push('ADMIN_SEED_PASSWORD is required (set via secrets, not in .env)');
  }
  
  // Validate email format with a proper regex pattern
  const email = process.env.ADMIN_EMAIL || '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.push('ADMIN_EMAIL must be a valid email address');
  }
  
  // Validate password strength
  const password = process.env.ADMIN_SEED_PASSWORD || '';
  if (password && password.length < 6) {
    errors.push('ADMIN_SEED_PASSWORD must be at least 6 characters');
  }
  
  return errors;
}

/**
 * Initialize Firebase Admin SDK
 */
async function initFirebaseAdmin() {
  try {
    const admin = require('firebase-admin');
    
    // Check if already initialized
    if (admin.apps.length > 0) {
      return admin;
    }
    
    // Try to use service account file if specified
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccountPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT);
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use default credentials from environment
      admin.initializeApp();
    } else {
      throw new Error(
        'Firebase Admin credentials not found. Set FIREBASE_SERVICE_ACCOUNT to the path of your service account JSON file, ' +
        'or set GOOGLE_APPLICATION_CREDENTIALS environment variable.'
      );
    }
    
    return admin;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error('firebase-admin package not installed. Run: npm install firebase-admin');
    }
    throw error;
  }
}

/**
 * Create or update admin user
 */
async function seedAdminUser(admin, email, password) {
  const auth = admin.auth();
  const db = admin.firestore();
  
  try {
    // Try to get existing user
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`[Seed] Found existing user: ${email} (uid: ${user.uid})`);
      
      // Update password
      await auth.updateUser(user.uid, { password });
      console.log('[Seed] Updated user password');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        user = await auth.createUser({
          email,
          password,
          emailVerified: true
        });
        console.log(`[Seed] Created new admin user: ${email} (uid: ${user.uid})`);
      } else {
        throw error;
      }
    }
    
    // Update Firestore user document
    const userDoc = {
      email,
      role: 'admin',
      isAdmin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Check if document exists
    const docRef = db.collection('users').doc(user.uid);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      await docRef.update(userDoc);
      console.log('[Seed] Updated Firestore user document with admin role');
    } else {
      await docRef.set({
        ...userDoc,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('[Seed] Created Firestore user document with admin role');
    }
    
    return { success: true, uid: user.uid };
  } catch (error) {
    console.error('[Seed] Error creating/updating admin user:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Admin Account Seed Script');
  console.log('='.repeat(60));
  
  // Validate environment
  const errors = validateEnvironment();
  if (errors.length > 0) {
    console.error('\n[Error] Missing or invalid configuration:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nPlease set the required environment variables and try again.');
    console.error('See .env.example for configuration options.');
    process.exit(1);
  }
  
  const email = process.env.ADMIN_EMAIL.trim();
  const password = process.env.ADMIN_SEED_PASSWORD;
  
  console.log(`\n[Seed] Target admin email: ${email}`);
  
  try {
    // Initialize Firebase Admin
    console.log('[Seed] Initializing Firebase Admin SDK...');
    const admin = await initFirebaseAdmin();
    
    // Create/update admin user
    console.log('[Seed] Creating/updating admin account...');
    const result = await seedAdminUser(admin, email, password);
    
    if (result.success) {
      console.log('\n' + '='.repeat(60));
      console.log('SUCCESS! Admin account is ready.');
      console.log('='.repeat(60));
      console.log(`Email: ${email}`);
      console.log(`UID: ${result.uid}`);
      console.log('\nYou can now log in with these credentials.');
    } else {
      console.error('\n' + '='.repeat(60));
      console.error('FAILED to seed admin account.');
      console.error('='.repeat(60));
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('FATAL ERROR');
    console.error('='.repeat(60));
    console.error(error.message);
    
    if (error.message.includes('firebase-admin')) {
      console.error('\nInstall firebase-admin:');
      console.error('  npm install firebase-admin');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateEnvironment,
  initFirebaseAdmin,
  seedAdminUser
};
