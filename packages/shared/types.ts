/**
 * Shared TypeScript interfaces for the GATE Exam Notes Platform.
 * Used by both apps/web and apps/mobile.
 */

/** Firestore user document */
export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "user" | "admin";
  createdAt: string; // ISO 8601
  lastSeen: string;  // ISO 8601
  isDisabled: boolean;
}

/** GATE Exam Subject document */
export interface Subject {
  id: string;
  name: string;
  category?: string; // e.g. "Core", "Maths", "Aptitude"
  description: string;
  thumbnailUrl?: string; // Firebase Storage image URL
  order: number;
  isPublished: boolean;
  createdAt: string; // ISO 8601
}

/** Nested folder structure within a subject */
export interface Folder {
  id: string;
  subjectId: string;
  parentId?: string | null; // null or undefined for root-level folders
  name: string;
  order: number;
  createdAt: string; // ISO 8601
  updatedAt?: string; // ISO 8601
}

export type ItemKind = "file" | "image";
export type NoteFileType = "pdf" | "ppt" | "doc" | "other";
export type LinkStatus = "unknown" | "ok" | "possibly_broken" | "invalid";

/** Study item: either a MEGA cloud file link (PDF/PPT/DOC) or a Firebase Storage image/diagram */
export interface Item {
  id: string;
  subjectId: string;
  folderId?: string | null; // null or undefined for root items
  kind: ItemKind;
  title: string;
  // When kind === "file"
  type?: NoteFileType;
  megaFileLink?: string;
  // When kind === "image"
  imageUrl?: string;
  caption?: string;
  order: number;
  isPublished: boolean;
  viewCount: number;
  createdAt: string; // ISO 8601
  updatedAt?: string; // ISO 8601
  linkStatus?: LinkStatus;
  lastCheckedAt?: string; // ISO 8601
}

/** Flattened sheet row representation in the Excel-like admin editor */
export interface SheetRowData {
  id: string; // temp id like "new-123" or existing id
  kind: "folder" | "file" | "image";
  subjectId: string;
  folderId: string | null;
  title: string;
  megaFileLink?: string;
  type?: NoteFileType;
  imageUrl?: string;
  caption?: string;
  order: number;
  isPublished: boolean;
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  linkStatus?: LinkStatus;
  lastCheckedAt?: string;
  // Visual & tree properties
  depth?: number;
  folderPath?: string;
  isExpanded?: boolean;
}

export interface SheetCommitOperation {
  op: "create" | "update" | "delete" | "move";
  entityType: "folder" | "item";
  id: string;
  data?: Partial<SheetRowData>;
  clientUpdatedAt?: string;
}

export interface SheetCommitPayload {
  operations: SheetCommitOperation[];
  normalizeOrder?: boolean;
}

export interface SheetConflict {
  id: string;
  entityType: "folder" | "item";
  title: string;
  clientData: Partial<SheetRowData>;
  serverData: Partial<SheetRowData>;
  serverUpdatedAt: string;
}

export interface SheetCommitResult {
  appliedCount: number;
  createdIdMap: Record<string, string>;
  conflicts: SheetConflict[];
  updatedFolders: Folder[];
  updatedItems: Item[];
}

export interface LinkCheckItem {
  id: string;
  url: string;
}

export interface LinkCheckResultItem {
  id: string;
  url: string;
  status: LinkStatus;
  checkedAt: string;
  reason?: string;
}

/** Backward compatibility alias for legacy Note references */
export type Note = Item;

/** Allowed user for allowlist private signup mode */
export interface AllowedUser {
  identifier: string; // lowercased email or E.164 phone
  addedAt: string;
  addedBy: string;
  notes?: string;
}

/** Daily OTP verification counts */
export interface OtpUsageRecord {
  date: string; // YYYY-MM-DD
  email: number;
  phone: number;
  brevo?: number;
  total: number;
}

/** An OTP request log visible to the administrator */
export interface OtpLogEntry {
  id: string;
  identifier: string;
  code: string;
  createdAt: string; // ISO 8601
  expiresAt: number; // timestamp in ms
  status: "pending" | "verified" | "expired";
  verifiedAt?: string;
}

/** Global platform statistics (single Firestore document) */
export interface StatsGlobal {
  totalUsers: number;
  totalSubjects: number;
  totalNotes: number; // or totalItems
  totalViews: number;
  otpUsage?: Record<string, { email: number; phone: number; brevo?: number; total: number }>;
}

/** A bookmarked item saved by a user */
export interface Bookmark {
  itemId: string;
  noteId?: string; // legacy support
  addedAt: string; // ISO 8601
}

/** A recently viewed item entry for a user */
export interface RecentItem {
  itemId: string;
  noteId?: string; // legacy support
  viewedAt: string; // ISO 8601
}

/** Standard API response envelope */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * JWT / session payload stored in the signed cookie.
 * `identifier` is whichever auth method was used (email or phone number).
 */
export interface SessionPayload {
  userId: string;
  role: "user" | "admin";
  identifier: string; // email address OR E.164 phone number
}
