const functions = require('firebase-functions');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');

// Initialize the admin SDK. In Cloud Functions environment this will use the
// default service account. Locally, set GOOGLE_APPLICATION_CREDENTIALS.
try {
  admin.initializeApp();
} catch (e) {
  // avoid reinitialize in emulator
  console.warn('admin.initializeApp() warning:', e.message);
}

/**
 * Helper: Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper: Generate a 6-digit verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Helper: Generate a unique token ID
 */
function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Helper: Verify reCAPTCHA token (if secret is provided)
 * @param {string} token - The reCAPTCHA token from client
 * @param {string} secret - The reCAPTCHA secret key
 * @returns {Promise<boolean>} - True if verification passed or no secret configured
 */
async function verifyRecaptcha(token, secret) {
  if (!secret) {
    // If no secret is configured, skip verification
    return true;
  }
  if (!token) {
    return false;
  }
  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: secret,
          response: token
        }
      }
    );
    return response.data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

/**
 * Helper: Check rate limiting for email/IP
 * @param {string} email - Email address
 * @param {string} ip - Client IP address
 * @param {number} maxPerHour - Maximum attempts per hour
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function checkRateLimit(email, ip, maxPerHour = 5) {
  const db = admin.firestore();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Check rate limit by email
  const emailRateLimitRef = db.collection('rateLimits').doc(`email:${email.toLowerCase()}`);
  const ipRateLimitRef = db.collection('rateLimits').doc(`ip:${ip}`);

  try {
    // Check email rate limit
    const emailDoc = await emailRateLimitRef.get();
    if (emailDoc.exists) {
      const data = emailDoc.data();
      // Filter attempts within the last hour
      const recentAttempts = (data.attempts || []).filter(
        (ts) => new Date(ts).getTime() > oneHourAgo.getTime()
      );
      if (recentAttempts.length >= maxPerHour) {
        return { allowed: false, reason: 'Too many verification requests for this email. Please try again later.' };
      }
    }

    // Check IP rate limit (separate limit, slightly higher threshold)
    const ipDoc = await ipRateLimitRef.get();
    if (ipDoc.exists) {
      const data = ipDoc.data();
      const recentAttempts = (data.attempts || []).filter(
        (ts) => new Date(ts).getTime() > oneHourAgo.getTime()
      );
      if (recentAttempts.length >= maxPerHour * 2) {
        return { allowed: false, reason: 'Too many requests from this IP. Please try again later.' };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open for availability)
    return { allowed: true };
  }
}

/**
 * Helper: Record rate limit attempt
 * @param {string} email - Email address
 * @param {string} ip - Client IP address
 */
async function recordRateLimitAttempt(email, ip) {
  const db = admin.firestore();
  const now = new Date().toISOString();

  try {
    const emailRateLimitRef = db.collection('rateLimits').doc(`email:${email.toLowerCase()}`);
    const ipRateLimitRef = db.collection('rateLimits').doc(`ip:${ip}`);

    await emailRateLimitRef.set(
      {
        attempts: admin.firestore.FieldValue.arrayUnion(now),
        lastAttempt: now
      },
      { merge: true }
    );

    await ipRateLimitRef.set(
      {
        attempts: admin.firestore.FieldValue.arrayUnion(now),
        lastAttempt: now
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Failed to record rate limit attempt:', error);
    // Non-critical, continue
  }
}

/**
 * Helper: Create and configure nodemailer transporter
 */
function createMailTransporter() {
  const smtpHost = process.env.SMTP_HOST || functions.config().smtp?.host;
  const smtpPort = parseInt(process.env.SMTP_PORT || functions.config().smtp?.port || '587', 10);
  const smtpUser = process.env.SMTP_USER || functions.config().smtp?.user;
  const smtpPass = process.env.SMTP_PASS || functions.config().smtp?.pass;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
}

/**
 * HTTPS Callable: sendVerificationCode
 * 
 * Accepts: { email: string, industryCode?: string, recaptchaToken?: string }
 * Returns: { success: true } or { success: false, error: string }
 * 
 * This function:
 * 1. Validates input
 * 2. Verifies reCAPTCHA (if configured)
 * 3. Checks rate limits
 * 4. Generates a 6-digit code and token
 * 5. Stores hashed code in Firestore
 * 6. Sends email via SMTP (if configured)
 */
exports.sendVerificationCode = functions.https.onCall(async (data, context) => {
  const { email, industryCode, recaptchaToken } = data || {};

  // Get client IP from context
  const clientIp = context.rawRequest?.ip || context.rawRequest?.headers?.['x-forwarded-for'] || 'unknown';

  // 1. Validate email
  if (!email || typeof email !== 'string') {
    return { success: false, error: 'Email is required.' };
  }
  if (!isValidEmail(email)) {
    return { success: false, error: 'Invalid email format.' };
  }

  // 2. Verify reCAPTCHA (if configured)
  const recaptchaSecret = process.env.RECAPTCHA_SECRET || functions.config().recaptcha?.secret;
  if (recaptchaSecret) {
    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken, recaptchaSecret);
    if (!isRecaptchaValid) {
      return { success: false, error: 'reCAPTCHA verification failed. Please try again.' };
    }
  }

  // 3. Check rate limits
  const maxPerHour = parseInt(
    process.env.RATE_LIMIT_MAX_PER_HOUR || functions.config().ratelimit?.maxperhour || '5',
    10
  );
  const rateLimitResult = await checkRateLimit(email, clientIp, maxPerHour);
  if (!rateLimitResult.allowed) {
    return { success: false, error: rateLimitResult.reason };
  }

  // 4. Generate code and token
  const code = generateVerificationCode();
  const token = generateToken();

  // 5. Hash the code before storing
  const saltRounds = 10;
  const hashedCode = await bcrypt.hash(code, saltRounds);

  // 6. Store in Firestore
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(now.toDate().getTime() + 15 * 60 * 1000) // 15 minutes
  );

  try {
    await db.collection('emailVerifications').doc(token).set({
      email: email.toLowerCase(),
      industryCode: industryCode || null,
      code: hashedCode,
      createdAt: now,
      expiresAt: expiresAt,
      clientIp: clientIp,
      verified: false
    });
  } catch (error) {
    console.error('Failed to store verification entry:', error);
    return { success: false, error: 'Failed to process verification request. Please try again.' };
  }

  // 7. Record rate limit attempt
  await recordRateLimitAttempt(email, clientIp);

  // 8. Send email (if SMTP is configured)
  const transporter = createMailTransporter();
  if (transporter) {
    try {
      const fromEmail = process.env.SMTP_FROM || functions.config().smtp?.from || 'noreply@example.com';
      await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: 'Your Verification Code',
        text: `Your verification code is: ${code}\n\nThis code will expire in 15 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verification Code</h2>
            <p>Your verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 15 minutes.</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `
      });
      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Continue even if email fails - code is stored in Firestore
    }
  } else {
    console.log('SMTP not configured, skipping email send');
  }

  // 9. Return success (optionally return debug code in development)
  const isDebug = process.env.DEBUG_SEND_CODE === 'true' || functions.config().debug?.sendcode === 'true';
  if (isDebug) {
    console.log(`DEBUG: Verification code for ${email}: ${code}`);
    return { success: true, token: token, debugCode: code };
  }

  return { success: true, token: token };
});

/**
 * HTTPS Callable: verifyCode
 * 
 * Accepts: { token: string, code: string }
 * Returns: { success: true, email: string, industryCode: string } or { success: false, error: string }
 * 
 * This function:
 * 1. Validates input
 * 2. Fetches the verification entry from Firestore
 * 3. Checks if not expired and not already verified
 * 4. Compares the code using bcrypt
 * 5. Marks the verification as verified
 */
exports.verifyCode = functions.https.onCall(async (data) => {
  const { token, code } = data || {};

  // 1. Validate input
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Token is required.' };
  }
  if (!code || typeof code !== 'string') {
    return { success: false, error: 'Code is required.' };
  }

  const db = admin.firestore();

  try {
    // 2. Fetch verification entry
    const verificationRef = db.collection('emailVerifications').doc(token);
    const doc = await verificationRef.get();

    if (!doc.exists) {
      return { success: false, error: 'Invalid or expired verification token.' };
    }

    const verificationData = doc.data();

    // 3. Check if already verified
    if (verificationData.verified) {
      return { success: false, error: 'This code has already been used.' };
    }

    // 4. Check expiration
    const now = admin.firestore.Timestamp.now();
    if (verificationData.expiresAt.toMillis() < now.toMillis()) {
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    // 5. Compare code using bcrypt
    const isMatch = await bcrypt.compare(code, verificationData.code);
    if (!isMatch) {
      return { success: false, error: 'Incorrect verification code.' };
    }

    // 6. Mark as verified
    await verificationRef.update({
      verified: true,
      verifiedAt: now
    });

    return {
      success: true,
      email: verificationData.email,
      industryCode: verificationData.industryCode
    };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, error: 'Failed to verify code. Please try again.' };
  }
});

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
