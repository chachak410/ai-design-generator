// Admin utilities for managing user data
// Run these commands in browser console after logging in as admin

const AdminUtils = {
  /**
   * 重置所有用户的问卷完成状态为 false
   * 这样所有用户在下次登录时都需要填写问卷
   */
  async resetAllUsersQuestionnaire() {
    if (!AppState.currentUser) {
      console.error('Please log in first');
      return;
    }

    console.log('Starting to reset questionnaire for all users...');
    
    try {
      const usersRef = AppState.db.collection('users');
      const snapshot = await usersRef.get();
      
      let count = 0;
      const batch = AppState.db.batch();
      
      snapshot.forEach((doc) => {
        batch.update(doc.ref, {
          questionnaireCompleted: false
        });
        count++;
      });
      
      await batch.commit();
      console.log(`✓ Successfully reset ${count} users' questionnaire status to false`);
      
    } catch (err) {
      console.error('Error resetting questionnaire:', err);
    }
  },

  /**
   * 查看特定用户的问卷完成状态
   */
  async checkUserQuestionnaire(uid) {
    try {
      const doc = await AppState.db.collection('users').doc(uid).get();
      if (!doc.exists) {
        console.error('User not found');
        return;
      }
      const userData = doc.data();
      console.log(`User ${uid}:`, {
        email: userData.email,
        questionnaireCompleted: userData.questionnaireCompleted,
        createdAt: userData.createdAt
      });
    } catch (err) {
      console.error('Error checking user:', err);
    }
  },

  /**
   * 查看所有用户的问卷完成状态统计
   */
  async getQuestionnaireStats() {
    try {
      const usersRef = AppState.db.collection('users');
      const snapshot = await usersRef.get();
      
      let completed = 0;
      let notCompleted = 0;
      const users = [];
      
      snapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.questionnaireCompleted) {
          completed++;
        } else {
          notCompleted++;
        }
        users.push({
          uid: doc.id,
          email: userData.email,
          questionnaireCompleted: userData.questionnaireCompleted
        });
      });
      
      console.log(`\n=== 问卷完成统计 ===`);
      console.log(`已完成: ${completed}`);
      console.log(`未完成: ${notCompleted}`);
      console.log(`总计: ${users.length}`);
      console.log(`\n用户详情:`);
      console.table(users);
      
    } catch (err) {
      console.error('Error getting stats:', err);
    }
  }
};

window.AdminUtils = AdminUtils;

console.log('Admin utils loaded. Available commands:');
console.log('- AdminUtils.resetAllUsersQuestionnaire() - Reset all users\' questionnaire status');
console.log('- AdminUtils.checkUserQuestionnaire(uid) - Check specific user');
console.log('- AdminUtils.getQuestionnaireStats() - View statistics');
