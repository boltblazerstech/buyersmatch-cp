# BuyersMatch API Reference

Base URL: `http://localhost:8080`

Admin routes (`/api/admin/**`) require the `X-Admin-Token` header (obtained from admin login), except `/api/admin/auth/login`.

---

## Auth

### POST /api/auth/login
Unified login. Checks `client_portal_users` first (returns role `CLIENT`), then `admin_users` (returns role `ADMIN`).

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "client@example.com", "password": "abc123"}'
```

**Response:** `{ id, email, role, clientId }` — `clientId` is the `buyer_briefs.id` UUID, only present for `CLIENT` role.

---

## Admin — Authentication

### POST /api/admin/auth/login
Admin-specific login. Returns a session token to use as `X-Admin-Token` on all subsequent admin requests.

```bash
curl -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "info@buyersmatch.com.au", "password": "bm123"}'
```

**Response:** `{ adminId, email, fullName, sessionToken }`

---

### POST /api/admin/auth/logout
Invalidates the current admin session token.

```bash
curl -X POST http://localhost:8080/api/admin/auth/logout \
  -H "X-Admin-Token: <token>"
```

---

### PATCH /api/admin/auth/change-password
Changes the admin password and invalidates the current session (requires re-login).

```bash
curl -X PATCH http://localhost:8080/api/admin/auth/change-password \
  -H "X-Admin-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "bm123", "newPassword": "newpass456"}'
```

---

## Admin — Client Management

### GET /api/admin/clients
Returns all portal users with their full `buyerBrief` record joined.

```bash
curl http://localhost:8080/api/admin/clients \
  -H "X-Admin-Token: <token>"
```

**Response:** `[{ id, loginEmail, status, notes, lastLoginAt, createdAt, updatedAt, buyerBrief }]`

---

### POST /api/admin/client
Creates a new portal user linked to an existing `buyer_brief`. Defaults `loginEmail` to `buyer_brief.email`. Always generates a random 10-char password and returns it.

```bash
curl -X POST http://localhost:8080/api/admin/client \
  -H "X-Admin-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"buyerBriefId": "uuid-of-buyer-brief"}'
```

Optional fields: `loginEmail`, `password` (override auto-generated password).

**Response:** `{ id, buyerBriefId, fullName, loginEmail, status, generatedPassword }`

---

### POST /api/admin/client/:clientId/notes
Saves or overwrites notes against a portal user record. `clientId` is `client_portal_users.id`.

```bash
curl -X POST http://localhost:8080/api/admin/client/uuid-of-portal-user/notes \
  -H "X-Admin-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Client prefers off-market deals in QLD."}'
```

**Response:** `{ id, notes }`

---

### POST /api/admin/assign-property
Creates a property assignment record linking a client, property, and buyer brief. Sets `portalStatus` to `PENDING`.

```bash
curl -X POST http://localhost:8080/api/admin/assign-property \
  -H "X-Admin-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "uuid-of-buyer-brief",
    "propertyId": "uuid-of-property",
    "briefId": "uuid-of-buyer-brief"
  }'
```

**Response:** Full `assignment` record.

---

### GET /api/admin/responses
Returns all property assignments across all clients, enriched with client name and property details.

```bash
curl http://localhost:8080/api/admin/responses \
  -H "X-Admin-Token: <token>"
```

**Response:** `[{ assignmentId, clientName, property, portalStatus, zohoStatus, updatedAt }]`

---

### POST /api/admin/user/:userId/reset-password
Generates a new random 10-char password for a portal user by their `client_portal_users.id`.

```bash
curl -X POST http://localhost:8080/api/admin/user/uuid-of-portal-user/reset-password \
  -H "X-Admin-Token: <token>"
```

**Response:** `{ newPassword }`

---

## Admin — Portal User Management

### GET /api/admin/portal-users
Lists all portal users. Filter by status with `?status=onboarded|deactivated|not_onboarded`.

```bash
curl "http://localhost:8080/api/admin/portal-users?status=onboarded" \
  -H "X-Admin-Token: <token>"
```

---

### GET /api/admin/portal-users/:buyerBriefId
Returns a single portal user by their `buyer_brief.id`.

```bash
curl http://localhost:8080/api/admin/portal-users/uuid-of-buyer-brief \
  -H "X-Admin-Token: <token>"
```

---

### POST /api/admin/portal-users/onboard
Onboards a new client portal user (same as `POST /api/admin/client` — prefer that for simplicity).

```bash
curl -X POST http://localhost:8080/api/admin/portal-users/onboard \
  -H "X-Admin-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"buyerBriefId": "uuid-of-buyer-brief", "loginEmail": "client@example.com"}'
```

---

### PATCH /api/admin/portal-users/:buyerBriefId/deactivate
Deactivates a portal user (blocks login).

```bash
curl -X PATCH http://localhost:8080/api/admin/portal-users/uuid-of-buyer-brief/deactivate \
  -H "X-Admin-Token: <token>"
```

---

### PATCH /api/admin/portal-users/:buyerBriefId/reactivate
Reactivates a portal user and clears any login lockout.

```bash
curl -X PATCH http://localhost:8080/api/admin/portal-users/uuid-of-buyer-brief/reactivate \
  -H "X-Admin-Token: <token>"
```

---

### PATCH /api/admin/portal-users/:buyerBriefId/email
Updates a portal user's login email.

```bash
curl -X PATCH http://localhost:8080/api/admin/portal-users/uuid-of-buyer-brief/email \
  -H "X-Admin-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"loginEmail": "newemail@example.com"}'
```

---

### PATCH /api/admin/portal-users/:buyerBriefId/reset-password
Sets a specific new password for a portal user (admin-supplied, not random).

```bash
curl -X PATCH http://localhost:8080/api/admin/portal-users/uuid-of-buyer-brief/reset-password \
  -H "X-Admin-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "TempPass99"}'
```

---

## Admin — Zoho Sync

### GET /api/admin/sync/status
Returns last sync times for all modules.

```bash
curl http://localhost:8080/api/admin/sync/status \
  -H "X-Admin-Token: <token>"
```

---

### POST /api/admin/sync/full
Wipes all local data and re-syncs everything from Zoho CRM. Destructive — use with care.

```bash
curl -X POST http://localhost:8080/api/admin/sync/full \
  -H "X-Admin-Token: <token>"
```

---

### POST /api/admin/sync/delta
Incremental sync — pulls only records modified since last sync.

```bash
curl -X POST http://localhost:8080/api/admin/sync/delta \
  -H "X-Admin-Token: <token>"
```

---

### POST /api/admin/sync/buyer-briefs
Wipes and re-syncs the buyer briefs module only.

```bash
curl -X POST http://localhost:8080/api/admin/sync/buyer-briefs \
  -H "X-Admin-Token: <token>"
```

---

### POST /api/admin/sync/properties
Wipes and re-syncs the properties module only.

```bash
curl -X POST http://localhost:8080/api/admin/sync/properties \
  -H "X-Admin-Token: <token>"
```

---

### POST /api/admin/sync/property-documents
Wipes and re-syncs property documents only.

```bash
curl -X POST http://localhost:8080/api/admin/sync/property-documents \
  -H "X-Admin-Token: <token>"
```

---

### POST /api/admin/sync/client-management
Wipes and re-syncs assignments (client management) only.

```bash
curl -X POST http://localhost:8080/api/admin/sync/client-management \
  -H "X-Admin-Token: <token>"
```

---

## Client Portal

### GET /api/client/:clientId/brief
Returns the buyer brief for a client. `clientId` accepts either `buyer_briefs.id` (UUID) or `zohoContactId`.

```bash
curl http://localhost:8080/api/client/uuid-or-zoho-contact-id/brief
```

---

### GET /api/client/:clientId/properties
Returns all property assignments for a client, including full property details and `portalStatus` on each item.

```bash
curl http://localhost:8080/api/client/uuid-or-zoho-contact-id/properties
```

**Response:** `[{ assignment, property, portalStatus }]`

---

### GET /api/client/:zohoContactId/assignments
Returns all assignments for a client by `zohoContactId`, with linked property data.

```bash
curl http://localhost:8080/api/client/zoho-contact-id/assignments
```

**Response:** `[{ assignment, property }]`

---

### GET /api/client/:zohoContactId/profile
Returns basic profile info for a client.

```bash
curl http://localhost:8080/api/client/zoho-contact-id/profile
```

**Response:** `{ fullName, email, secondaryEmail, greetingName, zohoContactId }`

---

### POST /api/client/assignment/:assignmentId/status
Updates the portal status of an assignment. `assignmentId` is `assignments.id` (UUID).

```bash
curl -X POST http://localhost:8080/api/client/assignment/uuid-of-assignment/status \
  -H "Content-Type: application/json" \
  -d '{"status": "ACCEPTED"}'
```

Valid values: `ACCEPTED`, `REJECTED`, `PURCHASED`, `PENDING`.

**Response:** Updated `assignment` record.

---

## Properties

### GET /api/properties
Returns all properties in the system.

```bash
curl http://localhost:8080/api/properties
```

---

### GET /api/properties/:zohoPropertyId
Returns a single property by its Zoho property ID.

```bash
curl http://localhost:8080/api/properties/zoho-property-id
```

---

### GET /api/properties/:zohoPropertyId/documents
Returns documents for a property categorised by file extension. Images: `png/jpg/jpeg`. Docs: `pdf`. Videos: `mp4/movie`.

```bash
curl http://localhost:8080/api/properties/zoho-property-id/documents
```

**Response:** `{ images, docs, videos }`

---

### GET /api/property/:propertyId
Returns a single property. `propertyId` accepts either `properties.id` (UUID) or `zohoPropertyId`.

```bash
curl http://localhost:8080/api/property/uuid-or-zoho-property-id
```

---

### GET /api/property/:propertyId/documents
Returns documents for a property categorised by `documentType`. Images: `documentType = "Due Diligence Image"`. Docs: everything else. `videoUrl` from `property.propertyVideoUrl`.

```bash
curl http://localhost:8080/api/property/uuid-or-zoho-property-id/documents
```

**Response:** `{ images, docs, videoUrl }`
