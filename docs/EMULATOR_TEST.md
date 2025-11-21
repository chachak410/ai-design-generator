# Emulator E2E Test: Cloud Function / adminActions

This guide walks you through running the Firebase Emulator Suite to test the Cloud Function that processes `users/{uid}/adminActions/{aid}` (activate/deactivate/reset) end-to-end without deploying to production.

Prerequisites
- Node.js (v16/18 recommended)
- Firebase CLI (`npm install -g firebase-tools`) logged in with `firebase login`
- This repository (project root contains `functions/`)

Files added
- `functions/test-trigger-action.js` — Node script to create an `adminActions` document for a user (designed to work with the Firestore emulator).

Quick steps

1) Install function deps

```bash
cd functions
npm install
cd ..
```

2) Start emulators (from project root)

```bash
firebase emulators:start --only functions,firestore,auth
```

When the emulators start you will see output like:
- Firestore running at: localhost:8080
- Functions running at: http://localhost:5001
- Auth running at: http://localhost:9099

Note: if your ports differ, adjust the environment variables in the test commands below.

3) Create a test client user in the Auth emulator

Open a new terminal and use the Firebase CLI or Admin SDK to create a user. Easiest is to use the Admin SDK in a short Node snippet. You can also create a user via the Emulator UI.

Example (node):

```js
// quick-create-user.js (one-off)
const admin = require('firebase-admin');
admin.initializeApp({projectId: 'demo-project'});
(async ()=>{
  const user = await admin.auth().createUser({email: 'client@example.com', password: 'password123'});
  console.log('Created user uid=', user.uid);
})();
```

Run it with the emulator env (set FIREBASE_AUTH_EMULATOR_HOST if needed):

```bash
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
node quick-create-user.js
```

4) Trigger an adminAction using the test helper

Replace `CLIENT_UID` with the uid printed from the create step.

From project root:

```bash
# If emulator Firestore uses a different host/port, set FIRESTORE_EMULATOR_HOST
export FIRESTORE_EMULATOR_HOST=localhost:8080
# optionally set TEST_MASTER_UID and TEST_MASTER_EMAIL
export TEST_MASTER_UID=test-master-uid
export TEST_MASTER_EMAIL=master@example.com

node functions/test-trigger-action.js --uid=CLIENT_UID --action=activate
```

The script writes a document at `users/CLIENT_UID/adminActions/{autoId}`. The Functions emulator should pick this up and process it. Check emulator console for function logs.

5) Observe function logs and result

- The functions emulator prints logs to the terminal where `firebase emulators:start` runs. Look for lines from `processAdminAction` showing action processed successfully.
- Verify that the Auth user was updated (disabled flag toggled) by querying Admin SDK in another snippet, or by trying to sign in via the Auth emulator.

Example check (node snippet):

```js
const admin = require('firebase-admin');
admin.initializeApp({projectId: 'demo-project'});
(async ()=>{
  const u = await admin.auth().getUser('CLIENT_UID');
  console.log('user disabled:', u.disabled);
})();
```

6) Test different actions

- `--action=deactivate` → function should call `admin.auth().updateUser(uid, { disabled: true })`
- `--action=activate` → function should call `admin.auth().updateUser(uid, { disabled: false })`
- `--action=resetPassword` → function should generate a reset link and attach it to the adminAction doc (check the `adminActions` doc content in emulator Firestore)

Troubleshooting
- If the function doesn't run, ensure the Functions emulator shows the trigger as loaded and that Firestore writes hit the emulator host (check the Firestore emulator UI or terminal output).
- If you see permission issues from the web app during tests, remember emulator security rules can be set separately; the emulator bypasses production IAM for Admin SDK calls.

Next steps
- Once emulator tests pass, you can deploy `functions` to real Firebase. For production the function needs to run under the Firebase project (and typically requires Blaze billing for sustained usage).
- After deployment, configure allowed master UIDs via:

```bash
firebase functions:config:set admin.master_uids="MASTER_UID"
```

Then deploy with `firebase deploy --only functions`.

If you want, I can:
- Add a one-shot script to create a test client user automatically during the emulator run and trigger an action, or
- Run through these steps interactively with you (I will provide commands to paste/run and explain outputs).

