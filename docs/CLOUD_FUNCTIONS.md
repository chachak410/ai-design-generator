# Cloud Functions for Admin Actions (unlock/lock/reset)

This document explains the Cloud Function included with the project (`functions/processAdminAction`) and how to deploy and test it. The goal: allow the master account to trigger admin actions from the website (via `users/{uid}/adminActions`) and have a secure server-side process perform the real Firebase Auth operations (disable/enable users, generate reset links), so unlocks work cross-device.

---

## What this function does

- Listens to newly created documents at `users/{uid}/adminActions/{aid}`.
- Validates a basic initiator guard (configured master UIDs).
- Supported actions:
  - `deactivate` — sets the Auth user `disabled: true` (prevents login).
  - `activate` — sets the Auth user `disabled: false` (re-enables login).
  - `resetPassword` — generates a password reset link for the user's email and writes `resetLink` into the adminAction doc.
- On success the function updates the adminAction doc to `status: 'done'` and writes an audit `supportRequests` entry under `users/{uid}`.
- On error the function updates `status: 'failed'` and writes `error`.

> Note: the function performs Auth operations with elevated privileges via the Admin SDK. It must be deployed to your Firebase project (or tested locally with the emulator). This function runs server-side — it does not expose admin privileges to clients.

---

## Files added

- `functions/index.js` — the Cloud Function logic (already present in this repo under `functions/`).
- `functions/package.json` — function dependencies and scripts.

---

## Required configuration

1. Firebase project and Firebase CLI access.
2. Admin credentials are provided by `firebase deploy` / runtime environment; no extra service account needed when deploying to Functions via Firebase.
3. Configure which UIDs are allowed to issue admin actions. There are two ways:
   - Use uid list config (recommended):
     ```bash
     firebase functions:config:set admin.master_uids="UID_OF_MASTER_USER"
     ```
     You can set multiple uids separated by commas.

   - Alternatively, you may adapt the function to read an email whitelist (not implemented here).

---

## Local emulator testing (recommended before deploy)

1. Install Firebase CLI and dependencies (if not yet):

```bash
npm install -g firebase-tools
cd functions
npm install
```

2. Start emulators from the project root to run functions, firestore, and auth locally:

```bash
firebase emulators:start --only functions,firestore,auth
```

3. In another terminal, you can write an `adminActions` doc manually (or use the website) to test the function. Example using `firebase` SDK or `curl` to Firestore emulator REST API.

---

## How to deploy

From project root:

```bash
# (optional) set allowed master uids
firebase functions:config:set admin.master_uids="UID_OF_MASTER"

# deploy only functions
firebase deploy --only functions
```

Notes:
- Deploying to production will run the function on Google Cloud; depending on usage you may need Blaze billing enabled.
- The function will run with Admin SDK privileges and can update Auth users irrespective of Firestore security rules.

---

## Integrating with the website

- The frontend should create an `adminActions` document under the target user's subcollection when the master wants to lock/unlock/reset. Example fields the frontend already writes:

```json
{
  "action": "activate", // or deactivate, resetPassword
  "status": "pending",
  "initiatedBy": "master@example.com",
  "initiatedByUid": "MASTER_UID",
  "createdAt": firebase.firestore.FieldValue.serverTimestamp()
}
```

- The Cloud Function uses the `initiatedByUid` / `initiatedBy` fields to perform a basic allow-list check. For stronger security, also restrict who can write `adminActions` in Firestore Rules (see recommendations below).

---

## Recommended Firestore rules (example)

This is an example snippet demonstrating the intention: allow only the master UID(s) to write `adminActions` for other users. Adjust as needed for your project.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/adminActions/{actionId} {
      allow create: if request.auth != null && request.auth.uid in ['MASTER_UID'];
      // prevent clients from directly marking actions as done/failed
      allow update: if false;
      allow read: if request.auth != null && request.auth.token.admin == true; // or other admin check
    }
  }
}
```

> Important: test your rules carefully. If your master is a normal client account (no special token), you must ensure the master account's uid is included in the allow-list.

---

## Troubleshooting

- If your master writes an `adminActions` doc but nothing happens after deploy:
  - Check Cloud Functions logs: `firebase functions:log --only processAdminAction` (or visit the Firebase Console > Functions > Logs).
  - Ensure `initiatedByUid` matches the configured `admin.master_uids` (if you set this config). If not set, the function will treat actions from unknown initiators as unauthorized.
  - Ensure the function has been deployed and is in `ACTIVE` state in the console.

- If you cannot deploy functions due to billing:
  - Use the Emulator Suite for local end-to-end testing. Production deployment generally requires Blaze for non-trivial usage.

---

## Security notes

- The Cloud Function has full Admin SDK access. Keep your Firebase project and function code secure.
- Do not allow arbitrary clients to write `adminActions` without authentication and authorization checks. Prefer server-side gating or Firestore rules that allow only configured master UIDs.

---

## Next steps I can do for you

- Help you set up and test the emulator locally with sample adminActions (I can provide terminal commands and test snippets).
- Prepare a ready-to-deploy Cloud Function with additional checks (IP allow list, logging to a monitoring collection, notification emails on action completed).
- Add a small script to your frontend that writes `initiatedByUid` when master clicks Unlock (if it's not already present).

If you want me to continue, tell me if you want (A) full deploy instructions + I prepare a small frontend change to include `initiatedByUid`, (B) run-through for emulator testing only, or (C) I generate additional hardened function features (e.g. email notification on complete).