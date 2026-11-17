# GATE Exam Notes Platform

A full-stack, high-yield GATE exam notes and study diagrams platform built for engineering students and educators. Features an admin management system for organizing subjects into nested folder hierarchies, storing PDFs/PPTs/DOCs via MEGA share links, and displaying study diagrams & formula sheets with an accessible full-screen image lightbox.

---

## 1. Overview & Tech Stack

- **Frontend Website**: Next.js 14 (App Router) + TypeScript + Tailwind CSS (Dark-first, friendly UI)
- **Custom Font**: **Sans Normal Hedeb 4** (`public/fonts/sans-normal-hedeb-4.ttf`) via Next.js `localFont` and `@font-face`
- **Card UI**: 96px (`h-24`) top thumbnail banner with distinct background color + metadata card body
- **Backend API**: Next.js Route Handlers (`/app/api/*`)
- **Database**: Zero-config persistent local database (`apps/web/lib/db.ts` storing in `data/db.json`).
- **Authentication**:
  - **Phone.email OTP**: Server-side verified phone and email login
  - **Admin Credentials**: Direct login for administrators
- **Session Handling**: Signed JWT (via `jose`) with 30-day lifetime in `httpOnly`, `Secure`, `SameSite=Lax` cookies.
- **Storage / Files**: Public MEGA share links (PDFs, PPTs, DOCs) and direct local/Firebase uploads for diagrams.
- **Bulk Importer**: 3-step wizard supporting `.xlsx`, `.xls`, and `.csv` files via SheetJS & PapaParse.

---

## 2. Admin Credentials

| Parameter | Value |
|-----------|-------|
| **Admin Username / Email** | `note@admin` |
| **Admin Password** | `Sayandip@123` |
| **Admin Route** | [http://localhost:3000/admin](http://localhost:3000/admin) |
| **Login Page** | [http://localhost:3000/login](http://localhost:3000/login) (Use "Admin Password" tab) |

---

## 3. GATE Exam Subject Categories

Subjects are categorized into:
- **Core** (Signals & Systems, Network Theory, EDC, Analog Circuits, Digital Circuits, EMFT, Control Systems, Communications)
- **Engineering Mathematics** (Linear Algebra, Calculus, Differential Equations, Probability & Statistics)
- **General Aptitude** (Numerical Ability, Verbal Ability, Reasoning)

---

## 4. Admin Excel-like Sheet Editor (`/admin/subjects/[id]/sheet`)

The Admin Panel includes a spreadsheet-style grid editor for organizing links and folders in one screen:
- **Dual View**: Toggle between **Explorer** (file tree) and **Sheet Grid** (spreadsheet). Preference is remembered in `localStorage`.
- **Inline Editing**: Double-click or press `Enter` to edit titles, MEGA links, file types, and image URLs.
- **Hierarchical Tree in Grid**: Folders appear above their child items with collapse/expand arrows (`â–¼ / â–¶`) and indentation.
- **Drag & Drop Reordering**: Drag rows by the index handle to reorder, or drag into a folder to move it there.
- **Quick Add**: Paste multiple MEGA links at once to batch-generate file rows instantly.
- **Batch Operations**: Floating bar for multi-row actions (Publish, Unpublish, Change Type, Move to Folder, Verify Links, Delete).
- **Link Checker**: Batch verifies MEGA links in parallel batches of 10.
- **Undo / Redo**: 50-step undo/redo stack (`Ctrl+Z`, `Ctrl+Shift+Z` / `Ctrl+Y`).
- **Export**: One-click download of the subject structure as `.xlsx` or `.csv`.
- **Keyboard Shortcuts**: Press `?` inside Sheet view to open the shortcuts cheat sheet.

---

## 5. Phone.email Setup (Email & Phone OTP)

The platform integrates Phone.email's plugins:
- **Sign in with Email** ([Docs](https://www.phone.email/docs-sign-in-with-email))
- **Sign in with Phone** ([Docs](https://www.phone.email/docs-sign-in-with-phone))

### Step 1: Register on Phone.email
1. Create a free account at [phone.email](https://phone.email).
2. Go to your **Admin Dashboard** and create an App.
3. Copy your **Client ID**.

### Step 2: Configure Environment Variables
In `apps/web/.env.local`:
```env
NEXT_PUBLIC_PHONE_EMAIL_CLIENT_ID=your_phone_email_client_id_here
NEXT_PUBLIC_AUTH_METHOD=both # "both", "email", or "phone"
JWT_SECRET=your_random_32_char_secret_key_here
ADMIN_IDENTIFIERS=your_email@domain.com,+1234567890
```

### Step 3: Frontend Integration
The button component is located at:
`apps/web/components/auth/PhoneEmailButton.tsx`

It loads `https://www.phone.email/sign_in_button_v1.js` and provides global callbacks:
- `window.phoneEmailReceiver(user_json_url)`: Called when a student verifies via Email OTP.
- `window.phoneEmailListener(user_json_url)`: Called when a student verifies via Phone OTP.

### Step 4: Backend Verification
When the frontend receives `user_json_url`, it sends it to `POST /api/auth/verify`.
The backend (`apps/web/lib/phone-email.ts`):
1. Ensures the URL uses `https://` and has hostname `user.phone.email`.
2. Requests the JSON file with Node.js `https.get` (no redirects, 5s timeout):
   - For **Email**: Reads `jsonData.user_email_id`.
   - For **Phone**: Reads `jsonData.user_country_code`, `jsonData.user_phone_number`, `jsonData.user_first_name`, `jsonData.user_last_name`.
3. Upserts the user in the database, checks `ADMIN_IDENTIFIERS` for admin role, and signs a JWT session cookie and mobile token.

---

## 3. Database (Zero Firebase Dependency)

All database operations are handled through `apps/web/lib/db.ts`:
- Automatically saves data to `apps/web/data/db.json` with in-memory caching.
- Seeded with sample courses (CS101, MATH101) so the platform works out-of-the-box.
- No Google Cloud Console, Firebase Admin SDK, or billing setup needed.

---

## 4. Setting Up Admins

Set your verified email or mobile number (in E.164 format e.g. `+1234567890`) in `ADMIN_IDENTIFIERS` in `.env.local`:
```env
ADMIN_IDENTIFIERS=admin@university.edu,+919876543210
```
When this email or phone verifies via OTP, they are automatically granted `role: "admin"` and can access `/admin`.

---

## 5. Running the Website

```bash
cd apps/web
cp .env.example .env.local
# Set NEXT_PUBLIC_PHONE_EMAIL_CLIENT_ID and JWT_SECRET
npm install
npm run dev
# Browse to http://localhost:3000
```

---

## 6. Running the Mobile App

```bash
cd apps/mobile
# In .env set API_BASE_URL to your computer's LAN IP:
# API_BASE_URL=http://192.168.1.50:3000
npm install
npm run start
```
The mobile app opens `/mobile-login` inside a secure WebView. Once OTP is verified, the token is posted back to the app, stored in `expo-secure-store`, and attached as `Authorization: Bearer <token>`.

---

## 7. MEGA Cloud Link Guidelines

- **Subject Course Links**: Use public MEGA folder links (`https://mega.nz/folder/XXXXXX#YYYYYY`).
- **Study Note Links**: Use public MEGA file links (`https://mega.nz/file/XXXXXX#YYYYYY`).
- Never enter your MEGA personal email or password into the platform. Only public share links are used.

---

## 8. Authentication System (Multi-Method)

### Two-Tab Login

The login page shows two tabs under "Student Sign In":

| Tab | Method | Env var |
|-----|--------|---------|
| **Email OTP** | Sign in with Email (Phone.email widget) | NEXT_PUBLIC_PHONE_EMAIL_EMAIL_CLIENT_ID |
| **Phone OTP** | Sign in with Phone (Phone.email widget) | NEXT_PUBLIC_PHONE_EMAIL_PHONE_CLIENT_ID |

Both tabs call POST /api/auth/verify with { user_json_url, method: "email"|"phone" }.

### Private-Use / Allowlist Mode

`env
SIGNUP_MODE=allowlist   # default — only pre-approved identifiers can sign in
SIGNUP_MODE=open        # anyone who verifies OTP can create an account
`

In llowlist mode, go to **Admin ? Allowed Users** to add emails or phone numbers (E.164 format). Anyone else sees *"Ask the admin for access"*.

### Brevo Email OTP (optional, disabled by default)

A second provider that sends a 6-digit code via Brevo transactional email. Activate it with:

`env
AUTH_PROVIDER=email-otp-brevo
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=no-reply@your-domain.com
`

Security properties: code hashed (SHA-256) in storage, 10-minute expiry, max 5 attempts, 3 requests/hour/email rate limit.

### New Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_PHONE_EMAIL_EMAIL_CLIENT_ID | Phone.email client ID for Email tab | — |
| NEXT_PUBLIC_PHONE_EMAIL_PHONE_CLIENT_ID | Phone.email client ID for Phone tab | — |
| SIGNUP_MODE | open or llowlist | llowlist |
| AUTH_PROVIDER | phone.email or email-otp-brevo | phone.email |
| BREVO_API_KEY | Brevo API key (Brevo provider only) | — |
| BREVO_SENDER_EMAIL | Sender email for OTP emails | — |

### OTP Usage Dashboard

**Admin ? Dashboard** shows a table of OTP verification events for the last 14 days, broken down by method (Email / Phone / Brevo) and total. Use this to monitor free-tier API usage.

### Admin ? Allowed Users Page

Add or remove allowed identifiers one-by-one or by CSV paste. Columns: identifier, label, added date, remove button.
