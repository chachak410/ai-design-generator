# Cloud Functions for AI Design Generator

This folder contains a simple Cloud Function that processes `adminActions` documents under `users/{uid}/adminActions/{aid}`.

What it does
- Listens for newly created adminActions
- If `action === 'activate'`, calls Firebase Admin SDK to set `disabled: false` for that user
- If `action === 'deactivate'` or `action === 'lock'`, sets `disabled: true`
- Marks the `adminAction` document as `done` or `error`
- Attempts to update the user's Firestore doc status (best-effort)

How to deploy

1. Install Firebase CLI and login:

```bash
npm install -g firebase-tools
firebase login
```

2. From this project root, initialize functions (if you haven't) and deploy:

```bash
cd functions
npm install
# Optionally run emulator for local testing
# firebase emulators:start --only functions,firestore

# Deploy only the functions
firebase deploy --only functions:processAdminActions
```

Notes
- Ensure your Firebase project has the proper billing/setup to run Cloud Functions.
- The function uses the default service account in Cloud Functions environment.
- For local testing you must set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account key with appropriate permissions.

Security
- The function requires Firestore & Auth admin privileges (provided by its service account).
- Make sure Firestore rules still prevent unprivileged clients from changing arbitrary user documents.

