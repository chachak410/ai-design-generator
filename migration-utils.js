// Admin utility to initialize credits for existing client accounts
const MigrationUtils = {
  async initializeCreditsForAllClients() {
    if (!AppState.currentUser || (AppState.userRole !== 'master' && AppState.userRole !== 'admin')) {
      alert('Only master/admin can perform this action');
      return;
    }

    try {
      console.log('Starting credit initialization for existing clients...');
      
      const db = AppState.db;
      const snapshot = await db.collection('users')
        .where('role', '==', 'client')
        .where('credits', '==', null)  // Only clients without credits
        .get();

      let count = 0;
      const batch = db.batch();

      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          credits: 20
        });
        count++;
      });

      if (count > 0) {
        await batch.commit();
        console.log(`✅ Initialized credits for ${count} client accounts`);
        alert(`Success! Initialized credits for ${count} client accounts`);
      } else {
        console.log('All client accounts already have credits initialized');
        alert('All client accounts already have credits initialized');
      }

    } catch (err) {
      console.error('Error initializing credits:', err);
      alert('Error: ' + err.message);
    }
  },

  async initializeCreditsForAllClientsForce() {
    if (!AppState.currentUser || (AppState.userRole !== 'master' && AppState.userRole !== 'admin')) {
      alert('Only master/admin can perform this action');
      return;
    }

    if (!confirm('This will set credits to 20 for ALL client accounts. Continue?')) {
      return;
    }

    try {
      console.log('Force initializing credits for ALL clients...');
      
      const db = AppState.db;
      const snapshot = await db.collection('users')
        .where('role', '==', 'client')
        .get();

      let count = 0;
      const batch = db.batch();

      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          credits: 20
        });
        count++;
      });

      if (count > 0) {
        await batch.commit();
        console.log(`✅ Force initialized credits for ${count} client accounts`);
        alert(`Success! Force initialized credits for ${count} client accounts`);
      } else {
        console.log('No client accounts found');
        alert('No client accounts found');
      }

    } catch (err) {
      console.error('Error initializing credits:', err);
      alert('Error: ' + err.message);
    }
  },

  async checkCreditsStatus() {
    try {
      const db = AppState.db;
      const snapshot = await db.collection('users').where('role', '==', 'client').get();

      let withCredits = 0;
      let withoutCredits = 0;

      snapshot.forEach(doc => {
        if (doc.data().credits !== undefined && doc.data().credits !== null) {
          withCredits++;
        } else {
          withoutCredits++;
        }
      });

      const msg = `Credit Status:\n- Clients with credits: ${withCredits}\n- Clients without credits: ${withoutCredits}\n- Total clients: ${withCredits + withoutCredits}`;
      console.log(msg);
      alert(msg);

    } catch (err) {
      console.error('Error checking status:', err);
      alert('Error: ' + err.message);
    }
  }
};

// Export to global scope
window.MigrationUtils = MigrationUtils;
