# 🎨 AI Design Generator

[remote content]
<image-card alt="AI Design Generator Demo" src="assets/screenshot.png" ></image-card>
**Visualize your ideas in seconds with AI-powered design generation!**

🌐 **Live Demo**: [AI Design Generator](https://chachak410.github.io/ai-design-generator/)
📂 **Repository**: [GitHub](https://github.com/chachak410/ai-design-generator)
[<image-card alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" ></image-card>](https://opensource.org/licenses/MIT)

## 📖 About

The **AI Design Generator** is a lightweight, browser-based tool that transforms your ideas into stunning design layouts, copy, and visual cues in seconds. Whether you're a designer, marketer, or business owner, this tool helps you create and iterate on designs effortlessly. Powered by AI, it generates customizable templates tailored to your industry, with optional email verification via EmailJS for a seamless user experience.

## ✨ Features

- **Instant Design Generation**: Enter a text prompt to get AI-generated layouts, copy, and visuals.
- **Customizable Templates**: Choose industry-specific templates created by admins.
- **Browser-Based**: No installation required—runs entirely in your browser.
- **Email Integration**: Optional EmailJS setup for user verification and password resets.
- **Download & Share**: Save or download your designs for immediate use.
- **Responsive Design**: Works seamlessly on desktop and mobile devices.

## 🚀 Getting Started

### For Users
1. Visit the [AI Design Generator](https://chachak410.github.io/ai-design-generator/).
2. Enter the **industry code** provided by your admin (a unique identifier for your template).
3. Edit your profile and select a template.
4. Type your design needs (e.g., "modern website layout for a tech startup").
5. Click **Generate** to explore design variations.
6. Refine, save, or download your designs.
7. (Optional) Verify your email to receive industry codes or reset passwords.

### For Admins
1. Sign up for an [EmailJS account](https://www.emailjs.com/) to enable email features.
2. Configure EmailJS:
   - Create email templates for verification or password resets.
   - Store your EmailJS API keys securely (e.g., in environment variables).
3. Set up the Master Account:
   - Create templates for different industries (e.g., e-commerce, education).
   - Assign industry codes to users.
   - **Master Navbar**: When logged in as a master user (role: 'master'), the navigation bar displays only:
     - **Template Creation** - Create and manage templates for industries
     - **Client Management** - View and manage client accounts
     - **Support Responses** - View and respond to support requests
     - **Logout** - Sign out of the application
4. Manage the tool via the admin dashboard (contact the team for access).

> **Note**: Admin credentials are private. Contact the project maintainers for access or use environment variables for secure setup.

## 🔐 Admin Account Configuration

Admin accounts have special privileges including access to Template Creation, Client Management, and Support Responses pages. There are two ways to configure admin accounts:

### Method 1: Email-Based Admin (Recommended)

Configure admin accounts by email address. Users with matching emails will automatically receive admin privileges.

#### Frontend Configuration (js/config/config.js)

Add admin emails to the `adminEmails` array:

```javascript
window.AppConfig = {
  // ... other config ...
  adminEmails: [
    "admin@example.com",
    "langtechgroup5@gmail.com"
  ]
};
```

#### Server Configuration (.env)

For server-side admin checks, set the `ADMIN_EMAILS` environment variable:

```bash
# .env file (do NOT commit this file)
ADMIN_EMAILS="admin@example.com,langtechgroup5@gmail.com"
```

### Method 2: Role-Based Admin

Set the user's `role` field to `admin` or `master` in Firestore:
- `master` - Full admin access with restricted navigation (admin pages only)
- `admin` - Full admin access with complete navigation

### Seed Admin Script

For initial setup or development, use the seed admin script:

```bash
# Set password securely via environment variable (NEVER commit passwords!)
export ADMIN_EMAIL="langtechgroup5@gmail.com"
export ADMIN_SEED_PASSWORD="your-secure-password"

# Run the seed script
node server/scripts/seedAdmin.js
```

**Security Best Practices:**
- Never commit passwords or secrets to the repository
- Use environment variables or secrets management for sensitive data
- In production, use proper secrets management (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, etc.)
- Set `ADMIN_SEED_PASSWORD` via CI/CD secrets or deployment platform environment variables

### Verification Steps

1. Sign in with an admin email configured in `adminEmails`
2. Verify that admin navigation links appear:
   - Template Creation
   - Client Management
   - Support Responses
3. Verify that non-admin users cannot see these links
### Configuring Admin Accounts

Admin accounts can access the admin navigation links (Template Creation, Client Management, Support Responses) in addition to standard client functionality. There are two ways to configure admin accounts:

#### Method 1: Environment Variable / Configuration (Recommended)

Configure admin emails without modifying the codebase by injecting them before the app loads:

**Option A: Inject via script tag (for static hosting)**
```html
<!-- Add this BEFORE the config.js script in your index.html -->
<script>
  window.ADMIN_EMAILS = ['admin@example.com', 'another-admin@example.com'];
</script>
```

**Option B: Modify config.js for deployment (not recommended for public repos)**
```javascript
// In js/config/config.js
window.AppConfig.adminEmails = ['admin@example.com'];
```

**Option C: CI/CD Build-time injection**
Configure your deployment pipeline to inject admin emails during the build process.

#### Method 2: Firestore Role (Database-based)

Set the user's `role` field to `'admin'` or `'master'` in the Firestore `users` collection:
- `role: 'admin'` - Shows all client navigation plus admin links
- `role: 'master'` - Shows only admin links (Template Creation, Client Management, Support Responses, Logout)

**Security Notes:**
- ⚠️ Never commit actual admin email addresses to the repository
- ⚠️ Use environment variables or secure secret management in production
- ⚠️ The admin configuration controls UI visibility; Firestore security rules should also validate permissions

See `.env.example` for detailed configuration instructions.

### Running Locally (For Developers)
1. Clone the repository:
   ```bash
   git clone https://github.com/chachak410/ai-design-generator.git