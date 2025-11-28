# Client Management Feature

This document describes the Client Management feature for master users to manage client accounts and their assigned templates.

## Overview

The Client Management feature allows users with the `master` role to:
- View a list of all client accounts
- View and edit client account details
- Assign and remove templates (specifications) from client accounts
- Manage client billing information and notes

## API Endpoints

All endpoints require authentication and master role. The endpoints are protected by the `requireMaster` middleware.

### List Clients

```
GET /api/clients
```

**Response:**
```json
{
  "clients": [
    {
      "_id": "client-id",
      "name": "Client Name",
      "email": "client@example.com",
      "status": "active",
      "templates": [],
      "notes": "",
      "billingInfo": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

### Get Client Details

```
GET /api/clients/:id
```

**Response:** Single client object with all fields.

### Update Client

```
PUT /api/clients/:id
```

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "status": "active",
  "notes": "Admin notes about this client",
  "billingInfo": {
    "address": "123 Main St",
    "company": "Company Inc",
    "taxId": "123-456-789"
  }
}
```

**Editable Fields:**
- `name` - Display name
- `email` - Email address
- `status` - Account status (`active`, `locked`, `suspended`)
- `notes` - Admin notes
- `billingInfo` - Billing information object

### Assign Template

```
POST /api/clients/:id/templates
```

**Request Body:**
```json
{
  "templateId": "template-name",
  "specs": {
    "size": "1:1",
    "colorScheme": "vibrant"
  }
}
```

**Response:** Updated client object with new template in `templates` array.

### Remove Template

```
DELETE /api/clients/:id/templates/:templateItemId
```

**Response:** Updated client object with template removed from `templates` array.

## Frontend Usage

The client management page is accessible from the main navigation for master users. The page provides:

1. **Client List Table** - Shows all clients with their basic info
2. **Search and Filters** - Filter by name, email, industry, template, or status
3. **Client Modal** - Detailed view and editing for individual clients
4. **Template Management** - View assigned templates, add new ones, remove existing

### Template Management in Modal

In the client details modal, master users can:
- View the list of assigned templates with their specifications
- Add a new template by providing templateId and optional specs JSON
- Remove a template by clicking the remove button next to it

## Data Model

### Client Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Unique client ID (Firebase doc ID) |
| `name` | string | Display name |
| `email` | string | Email address |
| `status` | string | `active`, `locked`, or `suspended` |
| `templates` | array | Array of template assignments |
| `notes` | string | Admin notes |
| `billingInfo` | object | Billing information |
| `createdAt` | timestamp | Account creation date |
| `updatedAt` | timestamp | Last update date |

### Template Entry Structure

```json
{
  "id": "tpl_123456789_abc",
  "templateId": "ecommerce",
  "specs": {
    "size": "1:1",
    "colorScheme": "vibrant"
  },
  "addedAt": "2024-01-01T00:00:00.000Z"
}
```

## Adapting to Different Model Names

If your project uses different field names, you may need to modify:

1. **server/models/client.js** - Update the `sanitizeClientForResponse` function to map your field names
2. **server/routes/clients.js** - Adjust the Firestore queries if your collection is named differently
3. **js/features/admin/client-management.js** - Update the frontend to match your field names

For example, if your users collection is named `clients` instead of `users`:

```javascript
// In server/routes/clients.js, change:
const snapshot = await db.collection('users').where('role', '==', 'client').get();
// To:
const snapshot = await db.collection('clients').get();
```

## Authentication

The feature uses the existing authentication middleware from `server/api/me.js`:

- `requireAuth` - Requires authenticated user
- `requireMaster` - Requires master or admin role

These middleware functions check `req.user` which should be populated by your authentication flow (e.g., Firebase Auth token verification).

## Testing

Run the tests:

```bash
npm test
```

The test file `tests/clients.test.js` contains integration tests for all API endpoints.

## Manual Testing Checklist

1. [ ] Login as a master user
2. [ ] Navigate to Client Management page
3. [ ] Verify client list loads
4. [ ] Click on a client to open details modal
5. [ ] Edit client name and save
6. [ ] Add a new template with specs
7. [ ] Remove a template
8. [ ] Search for a client by name/email
9. [ ] Filter clients by status
10. [ ] Verify non-master users cannot access the page
