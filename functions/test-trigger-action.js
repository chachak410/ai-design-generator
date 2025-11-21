/*
  Test helper: create an adminAction for a user in Firestore.
  Usage (from project root):

  # 1) Start emulators (from project root)
  firebase emulators:start --only functions,firestore,auth

  # 2) In another terminal, run this script (adjust host/port if your emulator uses different ports):
  TEST_MASTER_UID=test-master-uid node functions/test-trigger-action.js --uid=CLIENT_UID --action=activate

  The script supports env override for FIRESTORE_EMULATOR_HOST and PROJECT_ID.
*/

const admin = require('firebase-admin');
const argv = require('minimist')(process.argv.slice(2));

const uid = argv.uid || argv.u;
const action = argv.action || argv.a || 'activate';
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'demo-project';

if (!uid) {
  console.error('Usage: node functions/test-trigger-action.js --uid=CLIENT_UID --action=activate');
  process.exit(1);
}

// If running against Firestore Emulator, ensure FIRESTORE_EMULATOR_HOST is set (e.g. localhost:8080)
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log('[test-trigger-action] Using Firestore emulator at', process.env.FIRESTORE_EMULATOR_HOST);
}

admin.initializeApp({ projectId });
const db = admin.firestore();

(async () => {
  try {
    const initiatedBy = process.env.TEST_MASTER_EMAIL || 'master@example.com';
    const initiatedByUid = process.env.TEST_MASTER_UID || process.env.TEST_MASTER || 'test-master-uid';

    const docRef = await db
      .collection('users')
      .doc(uid)
      .collection('adminActions')
      .add({
        action: action,
        status: 'pending',
        initiatedBy: initiatedBy,
        initiatedByUid: initiatedByUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

    console.log('[test-trigger-action] Created adminAction:', docRef.id);
    process.exit(0);
  } catch (err) {
    console.error('[test-trigger-action] Error creating adminAction:', err);
    process.exit(2);
  }
})();
