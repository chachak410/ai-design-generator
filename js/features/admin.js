// js/features/admin.js: Admin Tools - Client Management & Support
import * as UI from './ui.js';

// Globals
let currentUser;
let userRole;

// Load Clients (for management page)
export async function loadClients() {
  if (userRole !== 'master') {
    UI.showMessage('admin-msg', 'Access denied: Master only.', 'error');
    return;
  }
  try {
    const snapshot = await db.collection('users').get();
    const clientsList = document.getElementById('clients-list') || document.createElement('div');
    clientsList.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'client') {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.innerHTML = `
          <p><strong>${data.name}</strong> (${data.email}) - Code: ${data.industryCode || 'N/A'}</p>
          <button onclick="editClient('${doc.id}')">Edit</button>
          <button onclick="deleteClient('${doc.id}')">Delete</button>
        `;
        clientsList.appendChild(card);
      }
    });
    UI.showElement('clients-container');
  } catch (err) {
    UI.showMessage('admin-msg', 'Error loading clients: ' + err.message, 'error');
  }
}

// Edit Client (stub - update profile)
export async function editClient(userId) {
  const userDoc = await db.collection('users').doc(userId).get();
  if (userDoc.exists) {
    const data = userDoc.data();
    // Show form with data (use UI for modal/form)
    const updateData = { name: prompt('New name:', data.name), productName: prompt('New product:', data.productName) };
    await db.collection('users').doc(userId).update(updateData);
    loadClients();  // Refresh
  }
}

// Delete Client (with confirmation)
export async function deleteClient(userId) {
  if (confirm('Delete user?')) {
    await db.collection('users').doc(userId).delete();
    loadClients();
  }
}

// Load Support Tickets (for support page)
export async function loadSupportTickets() {
  if (userRole !== 'master') {
    UI.showMessage('support-msg', 'Access denied.', 'error');
    return;
  }
  try {
    const snapshot = await db.collection('supportTickets').orderBy('createdAt', 'desc').get();
    const ticketsList = document.getElementById('tickets-list') || document.createElement('div');
    ticketsList.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const ticket = document.createElement('div');
      ticket.className = 'ticket-card';
      ticket.innerHTML = `
        <p><strong>${data.userName}</strong> (${data.email}): ${data.message}</p>
        <button onclick="replyTicket('${doc.id}', '${data.email}')">Reply</button>
      `;
      ticketsList.appendChild(ticket);
    });
    UI.showElement('tickets-container');
  } catch (err) {
    UI.showMessage('support-msg', 'Error loading tickets: ' + err.message, 'error');
  }
}

// Reply to Ticket (via EmailJS)
export async function replyTicket(ticketId, userEmail) {
  const reply = prompt('Reply message:');
  if (reply) {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { email: userEmail, message: reply });
    // Update ticket status in Firebase if needed
    await db.collection('supportTickets').doc(ticketId).update({ replied: true, replyTime: new Date() });
    loadSupportTickets();
  }
}

// Set Globals from Auth
export function setGlobals(user, role, industryCode, templates, specs, selected, genCount, productName, lang) {
  currentUser = user;
  userRole = role;
  userIndustryCode = industryCode;
  userTemplates = templates;
  userSpecs = specs;
  selectedSpecs = selected;
  generationCount = genCount;
  userProductName = productName;
  currentLanguage = lang;
}