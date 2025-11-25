const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize the admin SDK. In Cloud Functions environment this will use the
// default service account. Locally, set GOOGLE_APPLICATION_CREDENTIALS.
try {
  admin.initializeApp();
} catch (e) {
  // avoid reinitialize in emulator
  console.warn('admin.initializeApp() warning:', e.message);
}

/**
 * Process adminActions created under users/{uid}/adminActions/{aid}
 * Expected payload:
 *  { action: 'activate' | 'deactivate', status: 'pending', initiatedBy, reason }
 */
exports.processAdminActions = functions.firestore
  .document('users/{uid}/adminActions/{aid}')
  .onCreate(async (snap, ctx) => {
    const data = snap.data();
    const uid = ctx.params.uid;
    const aid = ctx.params.aid;

    if (!data || !data.action) {
      console.log('adminAction missing action, skipping', uid, aid);
      return null;
    }

    console.log(`Processing adminAction ${aid} for user ${uid}:`, data.action);

    try {
      if (data.action === 'activate') {
        // enable user in Firebase Auth
        await admin.auth().updateUser(uid, { disabled: false });
        console.log(`User ${uid} enabled in Firebase Auth.`);
      } else if (data.action === 'deactivate' || data.action === 'lock') {
        // disable user in Firebase Auth
        await admin.auth().updateUser(uid, { disabled: true });
        console.log(`User ${uid} disabled in Firebase Auth.`);
      } else if (data.action === 'unlockRequest') {
        // a request to unlock - you may choose to notify master or create a ticket
        console.log('Received unlockRequest (no-op in function):', uid, aid);
      } else {
        console.log('Unknown adminAction.action:', data.action);
      }

      // mark action processed
      await snap.ref.update({ status: 'done', processedAt: admin.firestore.FieldValue.serverTimestamp() });

      // Optionally update the users/{uid} doc status
      try {
        const userRef = admin.firestore().collection('users').doc(uid);
        if (data.action === 'activate') {
          await userRef.update({ status: 'active', failedAttempts: 0, unlockedAt: admin.firestore.FieldValue.serverTimestamp() });
        } else if (data.action === 'deactivate' || data.action === 'lock') {
          await userRef.update({ status: 'locked', lockedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
      } catch (e) {
        console.warn('Could not update users/{uid} doc:', e.message || e);
      }

      return null;
    } catch (err) {
      console.error('Error processing adminAction:', err);
      try {
        await snap.ref.update({ status: 'error', error: String(err) });
      } catch (uerr) {
        console.warn('Could not update adminAction status with error:', uerr.message || uerr);
      }
      return null;
    }
  });
