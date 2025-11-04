/**
 * Firebase Utilities
 */
const FirebaseHelper = {
  app: null,
  auth: null,
  db: null,
  init(config) {
    const cfg = config || window.AppConfig?.firebase;
    if (!cfg) { console.error('Firebase config missing'); return null; }
    if (!window.firebase?.initializeApp) { console.error('Firebase compat SDK not loaded'); return null; }

    this.app = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(cfg);
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    return this.app;
  },

  /**
   * Check if a user document exists
   */
  async userExists(db, uid) {
    try {
      const doc = await db.collection('users').doc(uid).get();
      return doc.exists;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  },

  /**
   * Get user data
   */
  async getUserData(db, uid) {
    try {
      const doc = await db.collection('users').doc(uid).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  /**
   * Update user data
   */
  async updateUserData(db, uid, data) {
    try {
      await db.collection('users').doc(uid).set(data, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error updating user data:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if industry code exists and is valid
   */
  async validateIndustryCode(db, code) {
    try {
      const doc = await db.collection('industryCodes').doc(code).get();
      
      if (!doc.exists) {
        return { valid: false, error: 'Industry code does not exist.' };
      }
      
      if (doc.data().used) {
        return { valid: false, error: 'Industry code has already been used.' };
      }
      
      return { valid: true, data: doc.data() };
    } catch (error) {
      console.error('Error validating industry code:', error);
      return { valid: false, error: error.message };
    }
  },

  /**
   * Mark industry code as used
   */
  async markIndustryCodeUsed(db, code, uid) {
    try {
      await db.collection('industryCodes').doc(code).update({
        used: true,
        usedBy: uid,
        usedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking industry code as used:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Save generation record
   */
  async saveGenerationRecord(db, uid, data) {
    try {
      await db.collection('generations').add({
        userId: uid,
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving generation record:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get user generation records
   */
  async getGenerationRecords(db, uid, limit = 3) {
    try {
      const snapshot = await db.collection('generations')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting generation records:', error);
      return [];
    }
  }
};

window.FirebaseHelper = FirebaseHelper;
window.initializeFirebase = (cfg) => FirebaseHelper.init(cfg);