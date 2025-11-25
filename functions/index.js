const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Helper: allowed master UIDs configured via `firebase functions:config:set admin.master_uids="uid1,uid2"`
function getAllowedMasterUids() {
  const raw = (functions.config().admin && functions.config().admin.master_uids) || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

exports.processAdminAction = functions.firestore
  .document('users/{uid}/adminActions/{aid}')
  .onCreate(async (snap, context) => {
    const { uid, aid } = context.params;
    const action = snap.data() || {};
    console.log('processAdminAction trigger', { uid, aid, action });

    // Only process pending actions
    if (action.status && action.status !== 'pending') {
      console.log('Skipping non-pending action:', action.status);
      return null;
    }

    // Authorization check: only allow configured master UIDs or 'system'
    const allowed = getAllowedMasterUids();
    const initiatorUid = action.initiatedByUid || action.initiatedBy || 'unknown';
    if (initiatorUid !== 'system' && allowed.length && !allowed.includes(String(initiatorUid))) {
      console.warn('Unauthorized initiator:', initiatorUid);
      await snap.ref.update({
        status: 'failed',
        error: 'unauthorized',
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return null;
    }

    try {
      if (action.action === 'deactivate') {
        await admin.auth().updateUser(uid, { disabled: true });

      } else if (action.action === 'activate') {
        await admin.auth().updateUser(uid, { disabled: false });

      } else if (action.action === 'resetPassword') {
        // Prefer generating a password reset link instead of setting plaintext
        // Look up email from Firestore then generate a reset link
        const userDoc = await db.collection('users').doc(uid).get();
        const userEmail = (userDoc.exists && userDoc.data().email) || action.email;
        if (!userEmail) throw new Error('No email available to generate password reset link');
        const link = await admin.auth().generatePasswordResetLink(userEmail);
        await snap.ref.update({ resetLink: link });

      } else {
        throw new Error('Unknown action: ' + action.action);
      }

      // Mark action done
      await snap.ref.update({
        status: 'done',
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Audit: add a supportRequests entry under the user's subcollection
      try {
        await db.collection('users').doc(uid).collection('supportRequests').add({
          category: 'security',
          message: `Admin action '${action.action}' processed by Cloud Function.`,
          status: 'resolved',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          type: 'admin'
        });
      } catch (auditErr) {
        console.warn('Failed to write audit supportRequests:', auditErr);
      }

      console.log('Action processed successfully:', action.action);
      return null;
    } catch (err) {
      console.error('Error processing admin action:', err);
      await snap.ref.update({
        status: 'failed',
        error: err.message || String(err),
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return null;
    }
  });
