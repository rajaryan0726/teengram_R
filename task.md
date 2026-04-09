# TeenGram Verification System — Task Tracker

## Phase 1: Dependencies & Infrastructure
- [x] Install bcryptjs, cloudinary, nodemailer
- [x] Update .env.local with Cloudinary & Super Admin credentials
- [x] Create lib/cloudinary.js
- [x] Create lib/generateCode.js
- [x] Create lib/email.js

## Phase 2: Database Models
- [x] Modify models/User.js
- [x] Create models/Institution.js
- [x] Create models/SubAdmin.js
- [x] Create models/VerificationCode.js

## Phase 3: Server Actions
- [x] Create actions/authActions.js
- [x] Create actions/adminActions.js
- [x] Create actions/superAdminActions.js
- [x] Create actions/subAdminActions.js

## Phase 4: Auth Changes
- [x] Modify app/api/auth/[...nextauth]/route.js
- [x] Create middleware.js

## Phase 5: Frontend Pages
- [x] Modify app/login/page.js
- [x] Create app/register/page.js
- [x] Create app/admin-setup/page.js
- [x] Create app/head-admin/page.js
- [x] Create app/admin-panel/page.js
- [x] Create app/sub-admin-panel/page.js

## Phase 6: Scripts & Migration
- [x] Create scripts/seedSuperAdmin.js
- [x] Create scripts/migrateUsers.js
