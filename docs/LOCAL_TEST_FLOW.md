# Local UI Test Flow — Seed local incident, Unlock, and Verify

This file contains copy-paste steps to reproduce the local fallback lock/unlock flow in your browser (no server required).

What you will verify
- Seed a local `local_security_incidents` entry that shows "5/5" on the login page.
- As master, open Support Response and click Unlock for the local incident — this should remove or mark the local incident resolved.
- Use Go to Client to navigate to Client Management (or prefill search) when Firestore queries are unavailable.
- Confirm that after a successful sign-in, any stale local incidents for that email are cleared by the client code.

Preconditions
- Open the app in your browser where the app's scripts are loaded (e.g., http://localhost:8080 if you're running the static server).
- You are logged in as the master account (email: langtechgroup5@gmail.com by default in the code).

Steps (copy/paste into the browser DevTools Console)

1) Seed a local incident for a test client email (client@example.com used here):

```javascript
// Seed a local incident using the built-in helper
Auth.seedLocalIncident('client@example.com', 5);

// Quick check: view local incidents
console.log(JSON.parse(localStorage.getItem('local_security_incidents') || '[]'));
```

You should now see a local entry with attempts=5 and status='locked'.

2) In a new tab or same browser where you're the master account, open the Support Response page and refresh it so it loads local incidents.

```javascript
// If needed, init the support page manually
SupportResponse.init().then(()=>{
  console.log('SupportResponse initialized — local incidents should appear in the list');
  SupportResponse.loadAllRequests();
});
```

3) Click the Unlock button in the UI for the local incident. If you prefer script-based flow, call the unlock helper directly.

```javascript
// If you have the local incident id from step 1, use it here — otherwise pass the email as the second param
const ls = JSON.parse(localStorage.getItem('local_security_incidents') || '[]');
console.log('current local incidents', ls);
const id = ls[0]?.id || ls[0]?.email;
SupportResponse.unlockLocalIncident(id, 'client@example.com');

// Then reload the list
SupportResponse.loadAllRequests();
```

Expected: the local incident is removed or marked resolved. Verify:

```javascript
console.log('after unlock, local incidents:', JSON.parse(localStorage.getItem('local_security_incidents') || '[]'));
```

4) Test "Go to Client" behavior (prefill search or open client modal):

```javascript
// If Firestore is accessible and a users/{uid} exists for client@example.com, this will open the client modal.
SupportResponse.findAndOpenClientByEmail('client@example.com');

// If Firestore is not accessible, the work-around will open the client management section and prefill the search input.
```

5) Verify that after a successful login, stale local incidents are cleared (client behavior implemented in `Auth.login`):

- Use the client browser (where the original `local_security_incidents` was created) and attempt to sign in with the correct credentials.
- On successful sign-in the client code will remove matching local incidents for that email.

Quick verification in console after a successful sign-in:

```javascript
console.log('local incidents post-login:', JSON.parse(localStorage.getItem('local_security_incidents') || '[]'));
```

Troubleshooting notes
- If the Support Response page doesn't show local incidents, run `SupportResponse.loadAllRequests()` from the console.
- If Master UI can't read Firestore data (permission errors), the page will still include local incidents and will use the local unlock fallback.
- If Unlock from Support UI creates an `adminActions` doc but you want to test server processing, follow `docs/EMULATOR_TEST.md` to run the Functions + Firestore emulator and confirm the Cloud Function processes adminActions.

If you'd like, I can also:
- Add a one-click "seed local incident" button into the Support Response page for quick demos (developer-only). 
- Create a small automated script that uses Puppeteer to run these steps headless and assert localStorage state (requires adding a dev dependency).

