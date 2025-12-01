# Cloud Functions for AI Design Generator

This folder contains Cloud Functions for the AI Design Generator application.

## Functions

### processAdminActions (Firestore Trigger)
Processes `adminActions` documents under `users/{uid}/adminActions/{aid}`.

- Listens for newly created adminActions
- If `action === 'activate'`, calls Firebase Admin SDK to set `disabled: false` for that user
- If `action === 'deactivate'` or `action === 'lock'`, sets `disabled: true`
- Marks the `adminAction` document as `done` or `error`
- Attempts to update the user's Firestore doc status (best-effort)

### sendVerificationCode (HTTPS Callable)
Server-side verification code generation and email sending.

**Request payload:**
```json
{
  "email": "user@example.com",
  "industryCode": "ABC123",
  "recaptchaToken": "optional-recaptcha-token"
}
```

**Response:**
```json
{
  "success": true,
  "token": "verification-token-id"
}
```

**Features:**
- Validates email format
- Verifies reCAPTCHA token (if RECAPTCHA_SECRET is configured)
- Enforces rate limiting per IP and per email (configurable, default 5 per hour)
- Generates a secure 6-digit verification code
- Hashes the code using bcrypt before storing in Firestore
- Sends email via SMTP if configured
- Stores verification entry in `/emailVerifications/{token}`

### verifyCode (HTTPS Callable)
Verifies a verification code against the stored hashed code.

**Request payload:**
```json
{
  "token": "verification-token-id",
  "code": "123456"
}
```

**Response (success):**
```json
{
  "success": true,
  "email": "user@example.com",
  "industryCode": "ABC123"
}
```

## Environment Configuration

### Required for Email Sending (SMTP)
Set these using Firebase Functions config:

```bash
firebase functions:config:set smtp.host="smtp.example.com"
firebase functions:config:set smtp.port="587"
firebase functions:config:set smtp.user="your-smtp-username"
firebase functions:config:set smtp.pass="your-smtp-password"
firebase functions:config:set smtp.from="noreply@example.com"
```

Alternatively, set environment variables:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### Optional: reCAPTCHA Verification
```bash
firebase functions:config:set recaptcha.secret="your-recaptcha-secret-key"
```

Or set `RECAPTCHA_SECRET` environment variable.

### Optional: Rate Limiting
```bash
firebase functions:config:set ratelimit.maxperhour="5"
```

Or set `RATE_LIMIT_MAX_PER_HOUR` environment variable.

### Optional: Debug Mode
Enable to return the verification code in responses (for development only):

```bash
firebase functions:config:set debug.sendcode="true"
```

Or set `DEBUG_SEND_CODE=true` environment variable.

**⚠️ WARNING:** Never enable debug mode in production!

## How to Deploy

1. Install Firebase CLI and login:

```bash
npm install -g firebase-tools
firebase login
```

2. From this project root, install dependencies and deploy:

```bash
cd functions
npm install

# Set required configuration (see Environment Configuration above)
firebase functions:config:set smtp.host="..." smtp.port="..." smtp.user="..." smtp.pass="..."

# Optionally run emulator for local testing
# firebase emulators:start --only functions,firestore

# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:sendVerificationCode,functions:verifyCode,functions:processAdminActions
```

## Testing

### Using Firebase Emulator
```bash
firebase emulators:start --only functions,firestore
```

### Using Mailtrap for SMTP Testing
1. Create a free account at [Mailtrap](https://mailtrap.io/)
2. Get your SMTP credentials from the inbox settings
3. Configure the functions with Mailtrap credentials:
```bash
firebase functions:config:set smtp.host="smtp.mailtrap.io" smtp.port="587" smtp.user="your-mailtrap-user" smtp.pass="your-mailtrap-pass"
```

## Firestore Collections

### /emailVerifications/{token}
Stores verification entries:
- `email`: The email address being verified
- `industryCode`: Optional industry code
- `code`: Bcrypt-hashed verification code
- `createdAt`: Timestamp when created
- `expiresAt`: Timestamp when it expires (15 minutes)
- `clientIp`: IP address of requester
- `verified`: Boolean, whether the code has been verified
- `verifiedAt`: Timestamp when verified (if applicable)

### /rateLimits/{key}
Stores rate limiting data:
- `attempts`: Array of ISO timestamp strings for each attempt
- `lastAttempt`: Last attempt timestamp

## Security Notes

- Verification codes are hashed using bcrypt before storage
- Codes expire after 15 minutes
- Rate limiting prevents abuse (configurable)
- reCAPTCHA integration available for bot protection
- The function uses the default service account in Cloud Functions environment
- For local testing, set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account key

## Migration from Client-Side Verification

The client-side code in `js/features/auth/registration.js` has been updated to:
1. First attempt to use the `sendVerificationCode` Cloud Function
2. Fall back to emailjs if the Cloud Function is not available or fails
3. Use server-side verification via `verifyCode` when a token is available
4. Fall back to local code comparison for emailjs-based verification
