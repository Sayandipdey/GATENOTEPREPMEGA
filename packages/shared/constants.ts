/**
 * Platform-wide constants shared between all apps and packages.
 * Focus: GATE Exam Notes Platform.
 */

/** Prefix all MEGA.nz links must start with. */
export const MEGA_URL_PREFIX = "https://mega.nz/" as const;

/** HTTP-only cookie that holds the signed session JWT. */
export const COOKIE_NAME = "np_session" as const;

/** Supported authentication methods. */
export const AUTH_METHODS = {
  EMAIL: "email",
  PHONE: "phone",
} as const;

export type AuthMethod = (typeof AUTH_METHODS)[keyof typeof AUTH_METHODS];

/** Allowed file types for file items. */
export const NOTE_TYPES = ["pdf", "ppt", "doc", "other"] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

/** Item kinds */
export const ITEM_KINDS = ["file", "image"] as const;
export type ItemKindType = (typeof ITEM_KINDS)[number];

/** Standard GATE Subject Categories for filter chips */
export const GATE_CATEGORIES = [
  "All",
  "Core",
  "Engineering Mathematics",
  "General Aptitude",
] as const;

export type GateCategory = (typeof GATE_CATEGORIES)[number];

/** User role constants. */
export const ROLES = {
  USER: "user",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Centralised API route paths.
 */
export const API_ROUTES = {
  // Auth
  AUTH_EMAIL_SEND_OTP:  "/api/auth/email/send-otp",
  AUTH_EMAIL_VERIFY:    "/api/auth/email/verify",
  AUTH_PHONE_VERIFY:    "/api/auth/phone/verify",
  AUTH_LOGOUT:          "/api/auth/logout",
  AUTH_ME:              "/api/auth/me",

  // Subjects (public / user)
  SUBJECTS:             "/api/subjects",
  SUBJECT_BY_ID:        "/api/subjects/[id]",

  // Items / Notes (public / user)
  ITEMS:                "/api/items",
  ITEM_BY_ID:           "/api/items/[id]",
  ITEM_VIEW:            "/api/items/[id]/view",

  // Legacy Notes routes aliases
  NOTES:                "/api/notes",
  NOTE_BY_ID:           "/api/notes/[id]",
  NOTE_VIEW:            "/api/notes/[id]/view",

  // User
  USER_BOOKMARKS:       "/api/user/bookmarks",
  USER_RECENT:          "/api/user/recent",
  USER_PROFILE:         "/api/user/profile",

  // Admin
  ADMIN_USERS:          "/api/admin/users",
  ADMIN_USER_BY_ID:     "/api/admin/users/[id]",
  ADMIN_SUBJECTS:       "/api/admin/subjects",
  ADMIN_SUBJECT_BY_ID:  "/api/admin/subjects/[id]",
  ADMIN_FOLDERS:        "/api/admin/folders",
  ADMIN_FOLDER_BY_ID:   "/api/admin/folders/[id]",
  ADMIN_ITEMS:          "/api/admin/items",
  ADMIN_ITEM_BY_ID:     "/api/admin/items/[id]",
  ADMIN_UPLOAD_URL:     "/api/admin/upload-url",
  ADMIN_STATS:          "/api/admin/stats",
  ADMIN_IMPORT:         "/api/admin/import",
  ADMIN_CSV_IMPORT:     "/api/admin/csv-import",
} as const;

export type ApiRoute = (typeof API_ROUTES)[keyof typeof API_ROUTES];

/**
 * Cookie max-age in seconds (30 days).
 */
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
