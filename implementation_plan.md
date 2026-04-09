# TeenGram Verification System — Implementation Plan

This plan implements the full institution-based user verification system as specified. It introduces role-based access (`SUPER_ADMIN`, `ADMIN`, `SUB_ADMIN`, `USER`), institution registration with document upload, verification code generation, and multi-tier approval workflows.

## User Review Required

> [!IMPORTANT]
> **Breaking Change — User Model**: The existing `User` model will gain new fields (`role`, `status`, `verification_code`, `institution`, `academic_info`, `id_card_url`, `password`). Existing users in the database will need a migration script to set `status: "verified"` and `role: "USER"` so they aren't locked out.

> [!IMPORTANT]
> **Password Hashing**: The spec requires username+password login. We will add `bcryptjs` as a dependency for secure password hashing. The existing "Testing Login" credentials provider auto-creates accounts — this will be replaced with real credential validation.

> [!WARNING]
> **File Uploads (Documents & ID Cards)**: The spec requires PDF/JPG/PNG uploads (5-10MB). Since there's no cloud storage configured, documents will be stored as **Base64 data URIs** in MongoDB for now. For production, this should be migrated to cloud storage (S3/Cloudinary). This keeps the implementation self-contained without requiring new infrastructure.

> [!CAUTION]
> **Head Admin (SUPER_ADMIN) Seeding**: The spec says "stored securely in DB, NOT hardcoded". We will create a one-time seed script (`scripts/seedSuperAdmin.js`) that the user runs manually to create the first SUPER_ADMIN account. The credentials will be set via environment variables.

---

## Proposed Changes

### Phase 1: Database Models

---

#### [MODIFY] [User.js](file:///c:/collegemajor/teengram/models/User.js)

Extend the existing User schema with verification-system fields:

```js
// NEW fields to add:
role: { type: String, enum: ['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'USER'], default: 'USER' },
status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
password: { type: String },  // bcrypt hashed (for credential login)
verification_code: { type: String },  // code entered during registration
institution: { type: Schema.Types.ObjectId, ref: 'Institution' },
academic_info: {
  type: { type: String, enum: ['school', 'college'] },
  standard_class: String,
  course: String,
  year: String,
},
id_card_url: { type: String },  // Base64 data URI of uploaded ID card
state: { type: String },
rejection_reason: { type: String },
verified_by: { type: Schema.Types.ObjectId, ref: 'User' },  // sub-admin who verified
```

---

#### [NEW] [Institution.js](file:///c:/collegemajor/teengram/models/Institution.js)

Stores institution registration data submitted by admins:

```
Fields:
- institution_name, institution_type (School/College/University/Coaching)
- year_of_establishment, affiliation_board_university
- institution_registration_number, official_website_url
- mandatory_documents: [{ name, type, data (Base64) }]  // min 1 required
- supporting_documents: [{ name, type, data }]
- address: { line1, line2, city, state, country, pincode }
- contact: { official_email, contact_number, landline_number }
- representative: { name, designation, email, contact, employee_id }
- admin: ObjectId ref → User (the admin who registered this)
- status: 'pending' | 'verified' | 'rejected'
- rejection_reason: String
- verified_by: ObjectId ref → User (SUPER_ADMIN)
- createdAt, updatedAt
```

---

#### [NEW] [SubAdmin.js](file:///c:/collegemajor/teengram/models/SubAdmin.js)

Links sub-admins to institutions with their assigned class/department:

```
Fields:
- user: ObjectId ref → User
- institution: ObjectId ref → Institution
- name: String
- assigned_class_department: String
- username: String (unique)
- createdAt
```

---

#### [NEW] [VerificationCode.js](file:///c:/collegemajor/teengram/models/VerificationCode.js)

System-generated codes linked to institution + sub-admin:

```
Fields:
- code: String (unique, e.g. "TG-SCH-9XK2P7")
- institution: ObjectId ref → Institution
- sub_admin: ObjectId ref → User
- created_by: ObjectId ref → User (admin)
- is_active: Boolean (default true)
- expires_at: Date (optional)
- createdAt
```

---

### Phase 2: Server Actions

---

#### [NEW] [authActions.js](file:///c:/collegemajor/teengram/actions/authActions.js)

Handles user registration and credential validation:

- `registerUser(formData)` — Creates new user with status `pending`, hashes password, validates verification code, links to institution/sub-admin
- `validateVerificationCode(code)` — Checks code exists, is active, not expired; returns linked institution/sub-admin info
- `loginWithCredentials(username, password)` — Validates credentials, checks user status

---

#### [NEW] [adminActions.js](file:///c:/collegemajor/teengram/actions/adminActions.js)

Institution admin registration and management:

- `registerInstitution(formData, adminUserId)` — Creates Institution record with documents, sets admin role
- `getAdminInstitution(adminUserId)` — Fetches institution for logged-in admin
- `createSubAdmin(formData, institutionId, adminUserId)` — Creates sub-admin user + SubAdmin record + generates verification code
- `getSubAdmins(institutionId)` — Lists all sub-admins for institution
- `editSubAdmin(subAdminId, formData)` — Updates sub-admin details
- `deleteSubAdmin(subAdminId)` — Removes sub-admin (users remain verified)
- `getVerificationCodes(institutionId)` — Lists all codes for institution
- `regenerateVerificationCode(subAdminId)` — Generates new code for sub-admin

---

#### [NEW] [superAdminActions.js](file:///c:/collegemajor/teengram/actions/superAdminActions.js)

Head admin (SUPER_ADMIN) dashboard actions:

- `getPendingInstitutions()` — All institutions with status `pending`
- `getVerifiedInstitutions()` — All verified institutions
- `getRejectedInstitutions()` — All rejected institutions
- `verifyInstitution(institutionId)` — Sets status to `verified`, sets admin user role to `ADMIN`
- `rejectInstitution(institutionId, reason)` — Sets status to `rejected` with reason
- `getInstitutionDetails(institutionId)` — Full details with documents for review

---

#### [NEW] [subAdminActions.js](file:///c:/collegemajor/teengram/actions/subAdminActions.js)

Sub-admin (teacher) panel actions:

- `getPendingUsers(subAdminId)` — Users linked via verification code to this sub-admin
- `getVerifiedUsers(subAdminId)` — Verified users under this sub-admin
- `getRejectedUsers(subAdminId)` — Rejected users
- `verifyUser(userId, subAdminId)` — Sets user status to `verified`
- `rejectUser(userId, reason, subAdminId)` — Sets user status to `rejected`
- `editUser(userId, formData)` — Edit user details
- `deleteUser(userId)` — Delete user

---

### Phase 3: Authentication Changes

---

#### [MODIFY] [route.js](file:///c:/collegemajor/teengram/app/api/auth/%5B...nextauth%5D/route.js)

Update the NextAuth configuration:

1. **Replace Testing Login** with real credential validation:
   - Look up user by username
   - Compare bcrypt-hashed password
   - Check `status === 'verified'` before allowing login
   - Return appropriate error messages for `pending`/`rejected` users

2. **Update Google provider signIn callback**:
   - For new Google users: don't auto-grant access, set `status: 'pending'`
   - For existing verified users: allow access normally

3. **Update session callback**:
   - Include `role`, `status`, `institution` in the session object

---

### Phase 4: Frontend Pages

---

#### [MODIFY] [page.js (login)](file:///c:/collegemajor/teengram/app/login/page.js)

Redesign the login page to match the spec:

- **Username + Password** form (primary)
- **Google Authentication** button
- Show verification status messages for unverified users
- Add links: "Register as User" → `/register`
- Add link: "Admin Setup (For Institutions Only)" → `/admin-setup`

---

#### [NEW] [page.js (register)](file:///c:/collegemajor/teengram/app/register/page.js)

Multi-step user registration form:

- **Step 1**: Basic Details (name, institution, age, university, state)
- **Step 2**: Academic Info (school → standard/class, college → course/year)
- **Step 3**: Account Info (email, username, password)
- **Step 4**: Verification Code entry (system auto-maps sub-admin)
- **Step 5**: ID Card upload
- **Submission**: Shows success message with pending status

---

#### [NEW] [page.js (admin-setup)](file:///c:/collegemajor/teengram/app/admin-setup/page.js)

Institution registration flow:

- Step 1: Google Auth sign-in (email must not already be registered)
- Step 2: "Register for Admin Panel" button
- Step 3: Multi-section form:
  - Institution Basic Info
  - Government/Regulatory Documents (file uploads with validation)
  - Institution Address
  - Official Contact Info
  - Authorized Representative
  - Admin Credentials
- Step 4: Submission with success/pending message
- Post-24hr: "Re-Apply" option

---

#### [NEW] [page.js (head-admin)](file:///c:/collegemajor/teengram/app/head-admin/page.js)

SUPER_ADMIN dashboard:

- **Tabs**: Pending | Verified | Rejected
- **Institution cards** with expandable detail view
- **Document viewer** (inline PDF/image preview)
- **Action buttons**: Verify ✅ | Reject ❌ (with reason modal)
- **Protected**: Only accessible by SUPER_ADMIN role

---

#### [NEW] [page.js (admin-panel)](file:///c:/collegemajor/teengram/app/admin-panel/page.js)

Institution admin dashboard:

- **Institution status** banner (pending/verified/rejected)
- **Sub-Admin Management**: Create, View list, Edit, Delete
- **Verification Code** display per sub-admin (copy-to-clipboard)
- **Protected**: Only accessible by ADMIN role with verified institution

---

#### [NEW] [page.js (sub-admin-panel)](file:///c:/collegemajor/teengram/app/sub-admin-panel/page.js)

Teacher-level dashboard:

- **Tabs**: Pending | Verified | Rejected Users
- **User cards** with ID card preview, student details
- **Actions**: Verify ✅ | Reject ❌ (with reason) | Edit ✏️ | Delete 🗑️
- **Protected**: Only accessible by SUB_ADMIN role

---

### Phase 5: Utility & Infrastructure

---

#### [NEW] [scripts/seedSuperAdmin.js](file:///c:/collegemajor/teengram/scripts/seedSuperAdmin.js)

One-time script to seed the SUPER_ADMIN user:

```bash
# Usage:
node scripts/seedSuperAdmin.js
# Reads from env: SUPER_ADMIN_EMAIL, SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD
```

---

#### [NEW] [middleware.js](file:///c:/collegemajor/teengram/middleware.js)

Next.js middleware for route protection:

- `/head-admin/*` → requires SUPER_ADMIN
- `/admin-panel/*` → requires ADMIN
- `/sub-admin-panel/*` → requires SUB_ADMIN
- `/feed`, `/Chat`, `/create`, etc. → requires verified USER
- `/login`, `/register`, `/admin-setup` → public

---

#### [NEW] [lib/generateCode.js](file:///c:/collegemajor/teengram/lib/generateCode.js)

Utility to generate verification codes in the format `TG-{TYPE}-{RANDOM}`:

```js
// Example outputs:
// TG-SCH-9XK2P7  (School)
// TG-COL-4HN8M2  (College)
// TG-UNI-7PL3K9  (University)
```

---

#### Install new dependency:

```bash
npm install bcryptjs
```

---

### Phase 6: Migration & Seeding

---

#### [NEW] [scripts/migrateUsers.js](file:///c:/collegemajor/teengram/scripts/migrateUsers.js)

Migration script for existing users:

```js
// Sets all existing users to:
// - status: 'verified'
// - role: 'USER'
// This ensures existing users aren't locked out after the update
```

---

## Open Questions

> [!IMPORTANT]
> **1. File Storage**: Documents are stored as Base64 in MongoDB for now. Do you want me to integrate with a cloud storage service (Cloudinary, S3) instead? This would be better for production but requires API keys.

> [!IMPORTANT]
> **2. SUPER_ADMIN Credentials**: What email/username/password do you want for the Head Admin account? I'll set these as env variables that the seed script reads.

> [!IMPORTANT]
> **3. Existing Users**: Should all existing users in the database be automatically set to `verified` status, or should they go through the new verification flow?

> [!WARNING]
> **4. OCR Verification**: The existing `/verify` page uses an external OCR API (`http://127.0.0.1:8000/extract-text/`). Should the new ID card verification in the sub-admin panel integrate with this OCR service as an assist tool, or should sub-admins only do manual visual review?

> [!IMPORTANT]
> **5. Email Notifications**: Should the system send email notifications when institutions/users are verified/rejected? This would require an email service (e.g., Resend, SendGrid).

---

## Verification Plan

### Automated Tests
1. Run `npm run build` to verify no compilation errors
2. Run `node scripts/seedSuperAdmin.js` to test seeding
3. Run `node scripts/migrateUsers.js` to test migration

### Manual Verification (Browser Testing)
1. **Login Page**: Verify new layout with Register/Admin Setup links
2. **Registration Flow**: Register a test user with verification code → verify pending status
3. **Admin Setup**: Register a test institution → verify pending status
4. **Head Admin Panel**: Login as SUPER_ADMIN → verify/reject test institution
5. **Admin Panel**: Login as ADMIN → create sub-admin → verify code generation
6. **Sub-Admin Panel**: Login as SUB_ADMIN → verify/reject test user
7. **Access Control**: Verify that unverified users cannot access protected routes
8. **Post-Verification**: Verify that verified users can login and access platform normally

### Summary of New Files (18 total)
| Category | Files |
|----------|-------|
| Models | `Institution.js`, `SubAdmin.js`, `VerificationCode.js` |
| Actions | `authActions.js`, `adminActions.js`, `superAdminActions.js`, `subAdminActions.js` |
| Pages | `register/page.js`, `admin-setup/page.js`, `head-admin/page.js`, `admin-panel/page.js`, `sub-admin-panel/page.js` |
| Utils | `lib/generateCode.js`, `middleware.js` |
| Scripts | `scripts/seedSuperAdmin.js`, `scripts/migrateUsers.js` |

### Modified Files (4 total)
| File | Change |
|------|--------|
| `models/User.js` | Add role, status, password, institution, academic fields |
| `app/api/auth/[...nextauth]/route.js` | Real credential validation, role in session |
| `app/login/page.js` | New layout with register/admin links |
| `package.json` | Add `bcryptjs` dependency |
