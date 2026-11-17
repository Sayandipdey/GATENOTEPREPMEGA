/**
 * Zod v3 validation schemas shared across the GATE Notes Platform.
 * Import from "@notes/shared" in both server and client code.
 */

import { z } from "zod";
import { NOTE_TYPES, MEGA_URL_PREFIX } from "./constants";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Validates that a string is a syntactically correct URL that starts with the
 * MEGA.nz origin. Used for file items on MEGA cloud.
 */
export const MegaLinkSchema = z
  .string()
  .url({ message: "Must be a valid URL" })
  .refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    { message: "Must be a valid web link (http:// or https://)" }
  );

// ---------------------------------------------------------------------------
// Subject (GATE Exam Subject)
// ---------------------------------------------------------------------------

export const SubjectCreateSchema = z.object({
  name: z.string().min(1, "Subject name is required").max(120),
  category: z.string().max(50).optional().default("Core"),
  description: z.string().max(1000).optional().default(""),
  thumbnailUrl: z.string().url("Must be a valid image URL").optional().or(z.literal("")),
  order: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
});

export type SubjectCreateInput = z.infer<typeof SubjectCreateSchema>;

// ---------------------------------------------------------------------------
// Folder (Arbitrary Depth Nested Folders)
// ---------------------------------------------------------------------------

export const FolderCreateSchema = z.object({
  subjectId: z.string().min(1, "subjectId is required"),
  parentId: z.string().nullable().optional(),
  name: z.string().min(1, "Folder name is required").max(120),
  order: z.number().int().min(0).default(0),
});

export type FolderCreateInput = z.infer<typeof FolderCreateSchema>;

// ---------------------------------------------------------------------------
// Item (Files & Images)
// ---------------------------------------------------------------------------

export const ItemCreateSchema = z.object({
  subjectId: z.string().min(1, "subjectId is required"),
  folderId: z.string().nullable().optional(),
  kind: z.enum(["file", "image"]).default("file"),
  title: z.string().min(1, "Title is required").max(200),
  type: z.enum(NOTE_TYPES).optional().default("pdf"),
  megaFileLink: z.string().optional(),
  imageUrl: z.string().optional(),
  caption: z.string().max(500).optional().default(""),
  order: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.kind === "file") {
    if (!data.megaFileLink || (!data.megaFileLink.startsWith("http://") && !data.megaFileLink.startsWith("https://"))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["megaFileLink"],
        message: "File items require a valid web link (https://...)",
      });
    }
  } else if (data.kind === "image") {
    if (!data.imageUrl || data.imageUrl.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageUrl"],
        message: "Image items require a valid image URL (uploaded or hosted)",
      });
    }
  }
});

export type ItemCreateInput = z.infer<typeof ItemCreateSchema>;

/** Backward compatibility alias */
export const NoteCreateSchema = ItemCreateSchema;
export type NoteCreateInput = ItemCreateInput;

// ---------------------------------------------------------------------------
// Bulk Import Schema
// ---------------------------------------------------------------------------

/**
 * A single row coming from the Excel / CSV bulk-import tool.
 * Column mapping:
 * - subject: Subject Name (required)
 * - category: Category (optional, e.g. Core, Maths, Aptitude)
 * - folderPath: Slash-separated folder hierarchy, e.g. "Unit 1/Fourier Series" (optional)
 * - title: Note or diagram title (required)
 * - kind: "file" | "image" (defaults to "file")
 * - type: "pdf" | "ppt" | "doc" | "other" (defaults to "pdf" if kind is file)
 * - link: MEGA link (for files) or Image URL (for images) (required)
 * - caption: caption or note (optional)
 */
export const BulkImportRowSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  category: z.string().optional().default("Core"),
  folderPath: z.string().optional().default(""),
  title: z.string().min(1, "Title is required"),
  kind: z.enum(["file", "image"]).optional().default("file"),
  type: z.enum(NOTE_TYPES).optional().default("pdf"),
  link: z.string().min(1, "Link / URL is required"),
  caption: z.string().optional().default(""),
});

export type BulkImportRow = z.infer<typeof BulkImportRowSchema>;

/** Backward compatibility alias for legacy CSV import */
export const CsvImportRowSchema = z.object({
  subject: z.string().min(1, "subject column is required"),
  title: z.string().min(1, "title column is required"),
  megaLink: MegaLinkSchema,
});
export type CsvImportRow = z.infer<typeof CsvImportRowSchema>;

// ---------------------------------------------------------------------------
// Sheet Commit & Link Check Schemas
// ---------------------------------------------------------------------------

export const SheetRowDataSchema = z.object({
  id: z.string(),
  kind: z.enum(["folder", "file", "image"]),
  subjectId: z.string(),
  folderId: z.string().nullable().optional(),
  title: z.string().min(1, "Title is required").max(120, "Title cannot exceed 120 chars"),
  megaFileLink: z.string().optional(),
  type: z.enum(NOTE_TYPES).optional(),
  imageUrl: z.string().optional(),
  caption: z.string().max(500).optional(),
  order: z.number().default(0),
  isPublished: z.boolean().default(true),
  viewCount: z.number().optional(),
  updatedAt: z.string().optional(),
  linkStatus: z.enum(["unknown", "ok", "possibly_broken", "invalid"]).optional(),
  lastCheckedAt: z.string().optional(),
});

export const SheetCommitOperationSchema = z.object({
  op: z.enum(["create", "update", "delete", "move"]),
  entityType: z.enum(["folder", "item"]),
  id: z.string(),
  data: SheetRowDataSchema.partial().optional(),
  clientUpdatedAt: z.string().optional(),
});

export const SheetCommitSchema = z.object({
  operations: z.array(SheetCommitOperationSchema).max(1000),
  normalizeOrder: z.boolean().optional(),
});

export const LinkCheckSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      url: z.string().url(),
    })
  ).max(100),
});

// ---------------------------------------------------------------------------
// Phone.email JWT URL
// ---------------------------------------------------------------------------

export const UserJsonUrlSchema = z
  .string()
  .url({ message: "Must be a valid URL" })
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return (
          parsed.hostname === "user.phone.email" &&
          url.startsWith("https://")
        );
      } catch {
        return false;
      }
    },
    {
      message:
        'URL must be an https:// URL on the "user.phone.email" hostname',
    }
  );
