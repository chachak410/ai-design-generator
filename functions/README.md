This folder contains a minimal Firebase Cloud Function to process admin actions created by the frontend.

What it does
- Listens for documents created at `users/{uid}/adminActions/{actionId}`.
- Validates initiator against an allowlist of master UIDs (configured via functions config).
- Performs privileged operations via the Admin SDK: `deactivate` (disable user), `activate` (enable user), and `resetPassword` (generates password reset link).
- Marks the adminAction document `done` or `failed` and writes an audit entry under `users/{uid}/supportRequests`.

Quick setup & deploy
1. Ensure Firebase CLI is installed and you're logged in:

```bash
npm install -g firebase-tools
firebase login
```

2. Initialize functions (if you didn't earlier):

```bash
cd /Users/mazihan/Desktop/ai-design-generator
firebase init functions
# choose JavaScript, keep using existing folder if prompted
```

3. Install function deps:

```bash
cd functions
npm install
```

4. Set master UID(s) so the function authorizes requests (replace with your master UID):

```bash
firebase functions:config:set admin.master_uids="MASTER_UID_1,MASTER_UID_2"
```

5. Test with emulators (recommended):

```bash
# from repo root
firebase emulators:start --only firestore,auth,functions
```

Then create a document under `users/{uid}/adminActions` with `status: 'pending'` and `action: 'deactivate'` (use the emulator UI or a script) to trigger processing.

6. Deploy to production:

```bash
# from repo root
firebase deploy --only functions
```

Security notes
- Use master UIDs rather than emails when possible. Get the master UID from the Firebase Console -> Authentication -> user details.
- The function treats initiator 'system' as allowed (useful for automated system-created requests). If you need stricter checks, update the validation logic.
- Avoid storing plaintext passwords — the function generates password reset links instead.

If you want, I can also:
- Add a second function to react to `securityIncidents` top-level docs,
- Add automated tests or an emulator script to create test adminActions,
- Help you run the emulator locally and perform a smoke test.
