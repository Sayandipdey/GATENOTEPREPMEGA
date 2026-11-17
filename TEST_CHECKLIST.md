# Notes Platform — Test & QA Checklist

## 1. Authentication (Sign in with Email & Sign in with Phone)
- [ ] Sign-in page loads the Phone.email widget button (`apps/web/components/auth/PhoneEmailButton.tsx`).
- [ ] Email OTP: Enter email address, receive OTP code, enter passcode.
- [ ] Phone OTP: Enter mobile number, receive SMS OTP code, enter passcode.
- [ ] Frontend triggers callback (`phoneEmailReceiver` for Email or `phoneEmailListener` for Phone).
- [ ] Backend validates `user_json_url` using Node.js HTTPS (must be `https://user.phone.email/*`).
- [ ] Invalid or forged URLs (e.g. non-phone.email host) are rejected with HTTP 400.
- [ ] After successful OTP verification, `np_session` httpOnly cookie is set for web and a token string is returned for mobile.
- [ ] User listed in `ADMIN_IDENTIFIERS` gets `role: "admin"`.
- [ ] Sign out clears the session cookie and redirects to `/login`.

## 2. Website (Student View)
- [ ] Home page displays subjects grouped by semester (Semester 1, Semester 2, etc.).
- [ ] Search input filters subjects dynamically by name or code.
- [ ] Clicking a subject navigates to `/subjects/[id]`.
- [ ] Subject header shows code, semester, description, and "Open Folder in MEGA" button.
- [ ] Notes list displays document type badges (PDF, PPT, DOC, OTHER).
- [ ] "Preview" toggle loads the MEGA embed iframe for previewable files.
- [ ] "Open ↗" button opens the MEGA share link in a new tab and increments viewCount.
- [ ] Bookmark toggle adds/removes note from `/bookmarks`.
- [ ] Recently opened notes appear on `/recent`.
- [ ] Theme toggle switches between dark mode (default) and light mode.

## 3. Admin Panel (/admin)
- [ ] Accessing `/admin` as a non-admin returns HTTP 403 Forbidden.
- [ ] Accessing `/admin` as an admin loads the IDE-style dashboard.
- [ ] Dashboard displays 4 stat metrics (Total Users, Subjects, Notes, Views).
- [ ] Signup trend chart renders daily user registrations over the last 30 days.
- [ ] Most viewed notes table lists top 5 notes by view count.
- [ ] Add Subject: Form validates code, name, semester, and checks MEGA folder link format.
- [ ] Edit & Delete Subject: Updates and deletes subject cascade to notes.
- [ ] Publish/Draft toggle updates visibility on the student website immediately.
- [ ] Subjects table allows moving rows up/down and saving the new order.
- [ ] Notes Management (`/admin/subjects/[id]/notes`): Add note with MEGA file link.
- [ ] "Check MEGA Link" button pings `/api/admin/link-check` and shows validation badge.
- [ ] User Accounts (`/admin/users`): Searchable table with Promote to Admin and Disable buttons.
- [ ] Disabling a user prevents them from logging in (HTTP 403).
- [ ] CSV Bulk Import (`/admin/import`): Paste CSV (subject, title, megaLink), preview parsed rows, bulk import notes.

## 4. Mobile App (Expo)
- [ ] App loads and redirects to Login if unauthenticated.
- [ ] "Sign In with OTP" opens WebView to `/mobile-login`.
- [ ] Completing OTP postMessages the token to the app.
- [ ] Token is saved in `expo-secure-store`.
- [ ] Bottom tabs: Courses, Bookmarks, Recent.
- [ ] Pull-to-refresh works across all tab screens.
- [ ] Tapping a note opens the MEGA link in an in-app browser (`expo-web-browser`) with fallback.

## 5. Security & Zero-Firebase Verification
- [ ] No Firebase dependencies, credentials, or service account keys required.
- [ ] All data persists in local database (`apps/web/data/db.json`).
- [ ] JWT tokens signed with HS256 using `JWT_SECRET`.
- [ ] Route Handlers protect endpoints with Edge middleware + `getUserIdFromRequest()` / `requireAdmin()`.
