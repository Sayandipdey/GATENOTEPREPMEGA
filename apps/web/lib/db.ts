/**
 * @file db.ts
 * @description Zero-dependency, lightweight, high-performance database for the GATE Exam Notes Platform.
 * Supports:
 * - Subjects (GATE subjects with category filter chips and thumbnails)
 * - Folders (Arbitrary depth nested folders)
 * - Items (MEGA cloud PDF/PPT/DOC file links + Firebase Storage images/diagrams)
 * - Users, Bookmarks, Recent, Stats
 * - Backward compatibility with legacy 'notes' references
 */

import fs from "fs";
import path from "path";
import type {
  User,
  Subject,
  Folder,
  Item,
  StatsGlobal,
  AllowedUser,
  OtpUsageRecord,
  OtpLogEntry,
  SheetCommitPayload,
  SheetCommitResult,
  SheetConflict,
} from "@notes/shared";

interface DatabaseSchema {
  users: Record<string, User>;
  subjects: Record<string, Subject>;
  folders: Record<string, Folder>;
  items: Record<string, Item>;
  stats: StatsGlobal;
  bookmarks: Record<string, Record<string, string>>; // userId -> itemId -> addedAt
  recent: Record<string, Array<{ itemId: string; viewedAt: string }>>; // userId -> items
  allowedUsers: Record<string, AllowedUser>;
  otpLogs?: OtpLogEntry[];
  otpCodes: Record<
    string,
    {
      hashedCode: string;
      expiresAt: number;
      attempts: number;
      requestCount: number;
      windowStart: number;
    }
  >;
}

let memoryDb: DatabaseSchema | null = null;

function getDbFilePath(): string {
  // Check candidate locations for existing db.json
  const candidates = [
    path.resolve(process.cwd(), "data", "db.json"),
    path.resolve(process.cwd(), "apps", "web", "data", "db.json"),
    path.resolve(__dirname, "..", "data", "db.json"),
  ];

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }

  // In Vercel serverless functions, /tmp is writable
  const tmpPath = path.resolve("/tmp", "gate-notes-db.json");
  try {
    if (fs.existsSync(tmpPath)) return tmpPath;
  } catch {}

  const defaultDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(defaultDir)) {
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
    } catch {
      return tmpPath;
    }
  }
  return path.resolve(defaultDir, "db.json");
}

function getDefaultData(): DatabaseSchema {
  const now = new Date().toISOString();
  return {
    users: {
      "admin_master": {
        id: "admin_master",
        name: "Platform Administrator",
        email: "note@admin",
        role: "admin",
        createdAt: now,
        lastSeen: now,
        isDisabled: false,
      },
    },
    subjects: {
      "gate-signals": {
        id: "gate-signals",
        name: "Signals & Systems",
        category: "Core",
        description: "Continuous and discrete-time signals, LTI systems, Fourier analysis, Laplace & Z-transforms for GATE EE/EC/IN.",
        thumbnailUrl: "",
        order: 0,
        isPublished: true,
        createdAt: now,
      },
      "gate-network": {
        id: "gate-network",
        name: "Network Theory",
        category: "Core",
        description: "Network solution methods, nodal and mesh analysis, network theorems, transient response, two-port networks.",
        thumbnailUrl: "",
        order: 1,
        isPublished: true,
        createdAt: now,
      },
      "gate-eng-maths": {
        id: "gate-eng-maths",
        name: "Engineering Mathematics",
        category: "Engineering Mathematics",
        description: "Linear Algebra, Calculus, Differential equations, Complex variables, Probability & Statistics.",
        thumbnailUrl: "",
        order: 2,
        isPublished: true,
        createdAt: now,
      },
      "gate-aptitude": {
        id: "gate-aptitude",
        name: "General Aptitude",
        category: "General Aptitude",
        description: "Verbal Ability, Quantitative Aptitude, Analytical Aptitude, and Spatial Aptitude for GATE.",
        thumbnailUrl: "",
        order: 3,
        isPublished: true,
        createdAt: now,
      },
    },
    folders: {
      "fld-signals-fourier": {
        id: "fld-signals-fourier",
        subjectId: "gate-signals",
        parentId: null,
        name: "Unit 1: Continuous-Time Fourier Series & Transform",
        order: 0,
        createdAt: now,
      },
      "fld-signals-lti": {
        id: "fld-signals-lti",
        subjectId: "gate-signals",
        parentId: null,
        name: "Unit 2: LTI Systems & Convolution",
        order: 1,
        createdAt: now,
      },
      "fld-network-theorems": {
        id: "fld-network-theorems",
        subjectId: "gate-network",
        parentId: null,
        name: "Chapter 1: Network Theorems (Thevenin, Norton, Superposition)",
        order: 0,
        createdAt: now,
      },
    },
    items: {
      "item-sig-1": {
        id: "item-sig-1",
        subjectId: "gate-signals",
        folderId: "fld-signals-fourier",
        kind: "file",
        title: "GATE Revision Notes: CTFT Properties & Duality Sheet",
        type: "pdf",
        megaFileLink: "https://mega.nz/file/sample-signals-1#gate2026",
        order: 0,
        isPublished: true,
        viewCount: 42,
        createdAt: now,
      },
      "item-sig-2": {
        id: "item-sig-2",
        subjectId: "gate-signals",
        folderId: "fld-signals-lti",
        kind: "file",
        title: "Impulse Response & Graphical Convolution Quick Guide",
        type: "pdf",
        megaFileLink: "https://mega.nz/file/sample-signals-2#gate2026",
        order: 0,
        isPublished: true,
        viewCount: 29,
        createdAt: now,
      },
      "item-net-1": {
        id: "item-net-1",
        subjectId: "gate-network",
        folderId: "fld-network-theorems",
        kind: "file",
        title: "Maximum Power Transfer & Thevenin Equivalent Cheat Sheet",
        type: "pdf",
        megaFileLink: "https://mega.nz/file/sample-network-1#gate2026",
        order: 0,
        isPublished: true,
        viewCount: 35,
        createdAt: now,
      },
      "item-math-1": {
        id: "item-math-1",
        subjectId: "gate-eng-maths",
        folderId: null,
        kind: "file",
        title: "Eigenvalues, Eigenvectors & Cayley-Hamilton Master Notes",
        type: "pdf",
        megaFileLink: "https://mega.nz/file/sample-maths-1#gate2026",
        order: 0,
        isPublished: true,
        viewCount: 56,
        createdAt: now,
      },
      "item-apt-1": {
        id: "item-apt-1",
        subjectId: "gate-aptitude",
        folderId: null,
        kind: "file",
        title: "Permutations, Combinations & Probability High Yield Formulas",
        type: "pdf",
        megaFileLink: "https://mega.nz/file/sample-apt-1#gate2026",
        order: 0,
        isPublished: true,
        viewCount: 18,
        createdAt: now,
      },
    },
    stats: {
      totalUsers: 1,
      totalSubjects: 4,
      totalNotes: 5,
      totalViews: 180,
      otpUsage: {},
    },
    bookmarks: {},
    recent: {},
    allowedUsers: {},
    otpLogs: [],
    otpCodes: {},
  };
}

function loadDatabase(): DatabaseSchema {
  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      // Migrate legacy schema if needed
      if (!parsed.folders) parsed.folders = {};
      if (!parsed.items) {
        parsed.items = {};
        if (parsed.notes) {
          Object.values(parsed.notes).forEach((n: any) => {
            parsed.items[n.id] = {
              ...n,
              kind: n.kind || "file",
              folderId: n.folderId || null,
            };
          });
        }
      }
      if (!parsed.allowedUsers) parsed.allowedUsers = {};
      if (!parsed.otpLogs) parsed.otpLogs = [];
      if (!parsed.otpCodes) parsed.otpCodes = {};
      if (!parsed.stats) {
        parsed.stats = { totalUsers: 0, totalSubjects: 0, totalNotes: 0, totalViews: 0 };
      }
      if (!parsed.stats.otpUsage) parsed.stats.otpUsage = {};

      memoryDb = parsed;
      return memoryDb!;
    }
  } catch (err) {
    console.warn("Could not read local DB file, initializing default:", err);
  }

  if (memoryDb) return memoryDb;
  memoryDb = getDefaultData();
  saveDatabase(memoryDb);
  return memoryDb;
}

function saveDatabase(data: DatabaseSchema): void {
  memoryDb = data;
  const filePath = getDbFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    try {
      fs.writeFileSync(path.resolve("/tmp", "gate-notes-db.json"), JSON.stringify(data, null, 2), "utf-8");
    } catch {
      console.warn("Could not persist database to disk:", err);
    }
  }
}

// ---------------------------------------------------------------------------
// Database API
// ---------------------------------------------------------------------------

export const db = {
  // Users
  users: {
    async get(id: string): Promise<User | null> {
      const data = loadDatabase();
      return data.users[id] ?? null;
    },
    async set(id: string, user: User): Promise<void> {
      const data = loadDatabase();
      data.users[id] = user;
      data.stats.totalUsers = Object.keys(data.users).length;
      saveDatabase(data);
    },
    async update(id: string, partial: Partial<User>): Promise<User | null> {
      const data = loadDatabase();
      if (!data.users[id]) return null;
      data.users[id] = { ...data.users[id], ...partial };
      saveDatabase(data);
      return data.users[id];
    },
    async list(): Promise<User[]> {
      const data = loadDatabase();
      return Object.values(data.users).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
  },

  // Subjects
  subjects: {
    async get(id: string): Promise<Subject | null> {
      const data = loadDatabase();
      return data.subjects[id] ?? null;
    },
    async create(input: Omit<Subject, "id" | "createdAt">): Promise<Subject> {
      const data = loadDatabase();
      const id = "sub_" + Math.random().toString(36).substring(2, 9);
      const subject: Subject = {
        id,
        ...input,
        createdAt: new Date().toISOString(),
      };
      data.subjects[id] = subject;
      data.stats.totalSubjects = Object.keys(data.subjects).length;
      saveDatabase(data);
      return subject;
    },
    async update(id: string, partial: Partial<Subject>): Promise<Subject | null> {
      const data = loadDatabase();
      if (!data.subjects[id]) return null;
      data.subjects[id] = { ...data.subjects[id], ...partial };
      saveDatabase(data);
      return data.subjects[id];
    },
    async delete(id: string): Promise<boolean> {
      const data = loadDatabase();
      if (!data.subjects[id]) return false;
      delete data.subjects[id];

      // Cascade delete folders
      Object.keys(data.folders).forEach((fldId) => {
        if (data.folders[fldId].subjectId === id) {
          delete data.folders[fldId];
        }
      });

      // Cascade delete items
      Object.keys(data.items).forEach((itemId) => {
        if (data.items[itemId].subjectId === id) {
          delete data.items[itemId];
        }
      });

      data.stats.totalSubjects = Object.keys(data.subjects).length;
      data.stats.totalNotes = Object.keys(data.items).length;
      saveDatabase(data);
      return true;
    },
    async reorder(ids: string[]): Promise<void> {
      const data = loadDatabase();
      ids.forEach((id, index) => {
        if (data.subjects[id]) {
          data.subjects[id].order = index;
        }
      });
      saveDatabase(data);
    },
    async list(publishedOnly = false): Promise<Subject[]> {
      const data = loadDatabase();
      let list = Object.values(data.subjects);
      if (publishedOnly) {
        list = list.filter((s) => s.isPublished);
      }
      return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
  },

  // Folders
  folders: {
    async get(id: string): Promise<Folder | null> {
      const data = loadDatabase();
      return data.folders[id] ?? null;
    },
    async create(input: Omit<Folder, "id" | "createdAt">): Promise<Folder> {
      const data = loadDatabase();
      const id = "fld_" + Math.random().toString(36).substring(2, 9);
      const folder: Folder = {
        id,
        ...input,
        parentId: input.parentId || null,
        createdAt: new Date().toISOString(),
      };
      data.folders[id] = folder;
      saveDatabase(data);
      return folder;
    },
    async update(id: string, partial: Partial<Folder>): Promise<Folder | null> {
      const data = loadDatabase();
      if (!data.folders[id]) return null;
      data.folders[id] = { ...data.folders[id], ...partial };
      saveDatabase(data);
      return data.folders[id];
    },
    async delete(id: string): Promise<boolean> {
      const data = loadDatabase();
      if (!data.folders[id]) return false;

      // Find all subfolder IDs recursively
      const toDeleteFolderIds = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        Object.values(data.folders).forEach((f) => {
          if (f.parentId && toDeleteFolderIds.has(f.parentId) && !toDeleteFolderIds.has(f.id)) {
            toDeleteFolderIds.add(f.id);
            changed = true;
          }
        });
      }

      // Delete items inside these folders
      Object.keys(data.items).forEach((itemId) => {
        const item = data.items[itemId];
        if (item.folderId && toDeleteFolderIds.has(item.folderId)) {
          delete data.items[itemId];
        }
      });

      // Delete folders
      toDeleteFolderIds.forEach((fId) => {
        delete data.folders[fId];
      });

      data.stats.totalNotes = Object.keys(data.items).length;
      saveDatabase(data);
      return true;
    },
    async listBySubject(subjectId: string): Promise<Folder[]> {
      const data = loadDatabase();
      return Object.values(data.folders)
        .filter((f) => f.subjectId === subjectId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    async reorder(ids: string[]): Promise<void> {
      const data = loadDatabase();
      ids.forEach((id, index) => {
        if (data.folders[id]) {
          data.folders[id].order = index;
        }
      });
      saveDatabase(data);
    },
  },

  // Items (Files & Images)
  items: {
    async get(id: string): Promise<Item | null> {
      const data = loadDatabase();
      return data.items[id] ?? null;
    },
    async create(input: Omit<Item, "id" | "createdAt" | "viewCount">): Promise<Item> {
      const data = loadDatabase();
      const id = "item_" + Math.random().toString(36).substring(2, 9);
      const item: Item = {
        id,
        ...input,
        folderId: input.folderId || null,
        createdAt: new Date().toISOString(),
        viewCount: 0,
      };
      data.items[id] = item;
      data.stats.totalNotes = Object.keys(data.items).length;
      saveDatabase(data);
      return item;
    },
    async update(id: string, partial: Partial<Item>): Promise<Item | null> {
      const data = loadDatabase();
      if (!data.items[id]) return null;
      data.items[id] = { ...data.items[id], ...partial };
      saveDatabase(data);
      return data.items[id];
    },
    async delete(id: string): Promise<boolean> {
      const data = loadDatabase();
      if (!data.items[id]) return false;
      delete data.items[id];
      data.stats.totalNotes = Object.keys(data.items).length;
      saveDatabase(data);
      return true;
    },
    async listBySubject(subjectId: string, publishedOnly = false): Promise<Item[]> {
      const data = loadDatabase();
      let list = Object.values(data.items).filter((i) => i.subjectId === subjectId);
      if (publishedOnly) {
        list = list.filter((i) => i.isPublished);
      }
      return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    async listByFolder(subjectId: string, folderId: string | null, publishedOnly = false): Promise<Item[]> {
      const data = loadDatabase();
      let list = Object.values(data.items).filter(
        (i) => i.subjectId === subjectId && (i.folderId || null) === folderId
      );
      if (publishedOnly) {
        list = list.filter((i) => i.isPublished);
      }
      return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    async incrementView(id: string, userId?: string): Promise<void> {
      const data = loadDatabase();
      if (data.items[id]) {
        data.items[id].viewCount = (data.items[id].viewCount ?? 0) + 1;
      }
      data.stats.totalViews = (data.stats.totalViews ?? 0) + 1;

      if (userId) {
        if (!data.recent[userId]) data.recent[userId] = [];
        const now = new Date().toISOString();
        data.recent[userId] = [
          { itemId: id, viewedAt: now },
          ...data.recent[userId].filter((item) => (item.itemId || (item as any).noteId) !== id),
        ].slice(0, 30);
      }

      saveDatabase(data);
    },
    async reorder(ids: string[]): Promise<void> {
      const data = loadDatabase();
      ids.forEach((id, index) => {
        if (data.items[id]) {
          data.items[id].order = index;
        }
      });
      saveDatabase(data);
    },
    async topViewed(limit = 6): Promise<Item[]> {
      const data = loadDatabase();
      return Object.values(data.items)
        .filter((i) => i.isPublished)
        .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
        .slice(0, limit);
    },
  },

  // Backward compatibility alias for legacy 'notes' references
  get notes() {
    return {
      get: this.items.get,
      create: (input: any) => this.items.create({ ...input, kind: "file" }),
      update: this.items.update,
      delete: this.items.delete,
      listBySubject: this.items.listBySubject,
      incrementView: this.items.incrementView,
      topViewed: this.items.topViewed,
    };
  },

  // Bookmarks
  bookmarks: {
    async list(userId: string): Promise<Item[]> {
      const data = loadDatabase();
      const userBookmarks = data.bookmarks[userId] ?? {};
      const itemIds = Object.keys(userBookmarks);
      return itemIds
        .map((id) => data.items[id])
        .filter((item): item is Item => Boolean(item && item.isPublished));
    },
    async toggle(userId: string, itemId: string, action?: "add" | "remove"): Promise<boolean> {
      const data = loadDatabase();
      if (!data.bookmarks[userId]) data.bookmarks[userId] = {};
      const exists = Boolean(data.bookmarks[userId][itemId]);
      const shouldAdd = action ? action === "add" : !exists;

      if (shouldAdd) {
        data.bookmarks[userId][itemId] = new Date().toISOString();
      } else {
        delete data.bookmarks[userId][itemId];
      }
      saveDatabase(data);
      return shouldAdd;
    },
  },

  // Recent
  recent: {
    async list(userId: string, limit = 20): Promise<(Item & { viewedAt: string })[]> {
      const data = loadDatabase();
      const items = data.recent[userId] ?? [];
      const result: (Item & { viewedAt: string })[] = [];

      for (const entry of items) {
        const id = entry.itemId || (entry as any).noteId;
        const item = data.items[id];
        if (item && item.isPublished) {
          result.push({
            ...item,
            viewedAt: entry.viewedAt,
          });
        }
        if (result.length >= limit) break;
      }
      return result;
    },
  },

  // Platform Global Stats
  stats: {
    async get(): Promise<StatsGlobal> {
      const data = loadDatabase();
      return {
        totalUsers: Object.keys(data.users).length,
        totalSubjects: Object.keys(data.subjects).length,
        totalNotes: Object.keys(data.items).length,
        totalViews: data.stats.totalViews ?? 0,
      };
    },
  },

  // Sheet Spreadsheet Commit & Batch Operations
  sheet: {
    async commit(
      subjectId: string,
      payload: SheetCommitPayload
    ): Promise<SheetCommitResult> {
      const data = loadDatabase();
      const now = new Date().toISOString();
      let appliedCount = 0;
      const createdIdMap: Record<string, string> = {};
      const conflicts: SheetConflict[] = [];

      for (const op of payload.operations) {
        if (op.op === "create") {
          if (op.entityType === "folder") {
            const newId = "fld_" + Math.random().toString(36).substring(2, 9);
            createdIdMap[op.id] = newId;

            // Resolve parentId if it referenced a newly created folder
            let parentId = op.data?.folderId || null;
            if (parentId && createdIdMap[parentId]) {
              parentId = createdIdMap[parentId];
            }

            const folder: Folder = {
              id: newId,
              subjectId,
              parentId,
              name: op.data?.title || "New Folder",
              order: op.data?.order ?? 1000,
              createdAt: now,
              updatedAt: now,
            };
            data.folders[newId] = folder;
            appliedCount++;
          } else {
            const newId = "item_" + Math.random().toString(36).substring(2, 9);
            createdIdMap[op.id] = newId;

            let folderId = op.data?.folderId || null;
            if (folderId && createdIdMap[folderId]) {
              folderId = createdIdMap[folderId];
            }

            const item: Item = {
              id: newId,
              subjectId,
              folderId,
              kind: op.data?.kind === "image" ? "image" : "file",
              title: op.data?.title || "Untitled",
              type: op.data?.type || "pdf",
              megaFileLink: op.data?.megaFileLink,
              imageUrl: op.data?.imageUrl,
              caption: op.data?.caption,
              order: op.data?.order ?? 1000,
              isPublished: op.data?.isPublished ?? true,
              viewCount: 0,
              createdAt: now,
              updatedAt: now,
              linkStatus: op.data?.linkStatus || "unknown",
            };
            data.items[newId] = item;
            appliedCount++;
          }
        } else if (op.op === "update") {
          if (op.entityType === "folder") {
            const folder = data.folders[op.id];
            if (!folder) continue;

            const serverUpdatedAt = folder.updatedAt || folder.createdAt;
            if (op.clientUpdatedAt && serverUpdatedAt > op.clientUpdatedAt) {
              conflicts.push({
                id: op.id,
                entityType: "folder",
                title: folder.name,
                clientData: op.data || {},
                serverData: {
                  title: folder.name,
                  order: folder.order,
                  folderId: folder.parentId,
                },
                serverUpdatedAt,
              });
              continue;
            }

            if (op.data?.title !== undefined) folder.name = op.data.title;
            if (op.data?.order !== undefined) folder.order = op.data.order;
            if (op.data?.folderId !== undefined) {
              let pId = op.data.folderId;
              if (pId && createdIdMap[pId]) pId = createdIdMap[pId];
              folder.parentId = pId;
            }
            folder.updatedAt = now;
            appliedCount++;
          } else {
            const item = data.items[op.id];
            if (!item) continue;

            const serverUpdatedAt = item.updatedAt || item.createdAt;
            if (op.clientUpdatedAt && serverUpdatedAt > op.clientUpdatedAt) {
              conflicts.push({
                id: op.id,
                entityType: "item",
                title: item.title,
                clientData: op.data || {},
                serverData: {
                  title: item.title,
                  megaFileLink: item.megaFileLink,
                  type: item.type,
                  imageUrl: item.imageUrl,
                  isPublished: item.isPublished,
                  order: item.order,
                },
                serverUpdatedAt,
              });
              continue;
            }

            if (op.data?.title !== undefined) item.title = op.data.title;
            if (op.data?.kind !== undefined) item.kind = op.data.kind === "image" ? "image" : "file";
            if (op.data?.megaFileLink !== undefined) item.megaFileLink = op.data.megaFileLink;
            if (op.data?.type !== undefined) item.type = op.data.type;
            if (op.data?.imageUrl !== undefined) item.imageUrl = op.data.imageUrl;
            if (op.data?.caption !== undefined) item.caption = op.data.caption;
            if (op.data?.isPublished !== undefined) item.isPublished = op.data.isPublished;
            if (op.data?.order !== undefined) item.order = op.data.order;
            if (op.data?.linkStatus !== undefined) item.linkStatus = op.data.linkStatus;
            if (op.data?.lastCheckedAt !== undefined) item.lastCheckedAt = op.data.lastCheckedAt;
            if (op.data?.folderId !== undefined) {
              let fId = op.data.folderId;
              if (fId && createdIdMap[fId]) fId = createdIdMap[fId];
              item.folderId = fId;
            }
            item.updatedAt = now;
            appliedCount++;
          }
        } else if (op.op === "move") {
          let targetFolderId = op.data?.folderId !== undefined ? op.data.folderId : null;
          if (targetFolderId && createdIdMap[targetFolderId]) {
            targetFolderId = createdIdMap[targetFolderId];
          }

          if (op.entityType === "folder") {
            const folder = data.folders[op.id];
            if (folder) {
              folder.parentId = targetFolderId;
              if (op.data?.order !== undefined) folder.order = op.data.order;
              folder.updatedAt = now;
              appliedCount++;
            }
          } else {
            const item = data.items[op.id];
            if (item) {
              item.folderId = targetFolderId;
              if (op.data?.order !== undefined) item.order = op.data.order;
              item.updatedAt = now;
              appliedCount++;
            }
          }
        } else if (op.op === "delete") {
          if (op.entityType === "folder") {
            delete data.folders[op.id];
            // Remove items inside this folder or move them to parent
            Object.keys(data.items).forEach((itemId) => {
              if (data.items[itemId].folderId === op.id) {
                delete data.items[itemId];
              }
            });
            appliedCount++;
          } else {
            delete data.items[op.id];
            appliedCount++;
          }
        }
      }

      if (payload.normalizeOrder) {
        // Re-index all folders and items belonging to this subject
        const subFolders = Object.values(data.folders)
          .filter((f) => f.subjectId === subjectId)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        subFolders.forEach((f, idx) => {
          f.order = (idx + 1) * 1000;
          f.updatedAt = now;
        });

        const subItems = Object.values(data.items)
          .filter((it) => it.subjectId === subjectId)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        subItems.forEach((it, idx) => {
          it.order = (idx + 1) * 1000;
          it.updatedAt = now;
        });
      }

      data.stats.totalNotes = Object.keys(data.items).length;
      saveDatabase(data);

      const updatedFolders = Object.values(data.folders)
        .filter((f) => f.subjectId === subjectId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const updatedItems = Object.values(data.items)
        .filter((it) => it.subjectId === subjectId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      return {
        appliedCount,
        createdIdMap,
        conflicts,
        updatedFolders,
        updatedItems,
      };
    },
  },

  // Allowed Users (Private allowlist mode)
  allowedUsers: {
    async list(): Promise<AllowedUser[]> {
      const data = loadDatabase();
      return Object.values(data.allowedUsers || {}).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    },
    async isAllowed(identifier: string): Promise<boolean> {
      const data = loadDatabase();
      const norm = identifier.trim().toLowerCase();
      if (data.allowedUsers?.[norm]) return true;
      const cleanPhone = norm.replace(/[\s-]/g, "");
      return Object.values(data.allowedUsers || {}).some(
        (u) => u.identifier.toLowerCase().replace(/[\s-]/g, "") === cleanPhone
      );
    },
    async add(identifier: string, addedBy = "admin", notes = ""): Promise<AllowedUser> {
      const data = loadDatabase();
      if (!data.allowedUsers) data.allowedUsers = {};
      const norm = identifier.trim().toLowerCase();
      const record: AllowedUser = {
        identifier: norm,
        addedAt: new Date().toISOString(),
        addedBy,
        notes,
      };
      data.allowedUsers[norm] = record;
      saveDatabase(data);
      return record;
    },
    async addBulk(identifiers: string[], addedBy = "admin"): Promise<{ added: number; skipped: number }> {
      const data = loadDatabase();
      if (!data.allowedUsers) data.allowedUsers = {};
      let added = 0;
      let skipped = 0;
      const now = new Date().toISOString();

      for (const idStr of identifiers) {
        const norm = idStr.trim().toLowerCase();
        if (!norm) continue;
        if (data.allowedUsers[norm]) {
          skipped++;
        } else {
          data.allowedUsers[norm] = {
            identifier: norm,
            addedAt: now,
            addedBy,
          };
          added++;
        }
      }
      saveDatabase(data);
      return { added, skipped };
    },
    async remove(identifier: string): Promise<boolean> {
      const data = loadDatabase();
      const norm = identifier.trim().toLowerCase();
      if (!data.allowedUsers?.[norm]) return false;
      delete data.allowedUsers[norm];
      saveDatabase(data);
      return true;
    },
  },

  // Daily OTP Verification Usage Counter
  otpUsage: {
    async record(method: "email" | "phone" | "brevo" = "phone"): Promise<void> {
      const data = loadDatabase();
      if (!data.stats) {
        data.stats = { totalUsers: 0, totalSubjects: 0, totalNotes: 0, totalViews: 0 };
      }
      if (!data.stats.otpUsage) data.stats.otpUsage = {};

      const today = new Date().toISOString().split("T")[0];
      if (!data.stats.otpUsage[today]) {
        data.stats.otpUsage[today] = { email: 0, phone: 0, brevo: 0, total: 0 };
      }

      const rec = data.stats.otpUsage[today];
      if (method === "email") rec.email = (rec.email || 0) + 1;
      else if (method === "phone") rec.phone = (rec.phone || 0) + 1;
      else if (method === "brevo") rec.brevo = (rec.brevo || 0) + 1;
      rec.total = (rec.total || 0) + 1;

      saveDatabase(data);
    },
    async getDailyStats(days = 14): Promise<OtpUsageRecord[]> {
      const data = loadDatabase();
      const usageMap = data.stats?.otpUsage || {};
      const results: OtpUsageRecord[] = [];

      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split("T")[0];
        const entry = usageMap[dateStr] || { email: 0, phone: 0, brevo: 0, total: 0 };
        results.push({
          date: dateStr,
          email: entry.email || 0,
          phone: entry.phone || 0,
          brevo: entry.brevo || 0,
          total: entry.total || 0,
        });
      }

      return results;
    },
  },

  // Brevo / Generic OTP Code store
  otpCodes: {
    async saveOtp(identifier: string, hashedCode: string, expiresAt: number): Promise<boolean> {
      const data = loadDatabase();
      if (!data.otpCodes) data.otpCodes = {};
      const norm = identifier.trim().toLowerCase();

      const existing = data.otpCodes[norm];
      const now = Date.now();
      let requestCount = 1;
      let windowStart = now;

      // Rate limit: 3 requests per hour
      if (existing && now - existing.windowStart < 3600 * 1000) {
        if (existing.requestCount >= 3) {
          return false;
        }
        requestCount = existing.requestCount + 1;
        windowStart = existing.windowStart;
      }

      data.otpCodes[norm] = {
        hashedCode,
        expiresAt,
        attempts: 0,
        requestCount,
        windowStart,
      };
      saveDatabase(data);
      return true;
    },
    async getOtp(identifier: string) {
      const data = loadDatabase();
      const norm = identifier.trim().toLowerCase();
      return data.otpCodes?.[norm] || null;
    },
    async incrementAttempts(identifier: string): Promise<number> {
      const data = loadDatabase();
      const norm = identifier.trim().toLowerCase();
      if (!data.otpCodes?.[norm]) return 0;
      data.otpCodes[norm].attempts = (data.otpCodes[norm].attempts || 0) + 1;
      saveDatabase(data);
      return data.otpCodes[norm].attempts;
    },
    async deleteOtp(identifier: string): Promise<void> {
      const data = loadDatabase();
      const norm = identifier.trim().toLowerCase();
      if (data.otpCodes?.[norm]) {
        delete data.otpCodes[norm];
        saveDatabase(data);
      }
    },
  },

  // Manual OTP request / audit logs for Admin Panel
  otpLogs: {
    async list(limit = 50): Promise<OtpLogEntry[]> {
      const data = loadDatabase();
      const logs = data.otpLogs || [];
      const now = Date.now();
      let changed = false;
      logs.forEach((entry) => {
        if (entry.status === "pending" && now > entry.expiresAt) {
          entry.status = "expired";
          changed = true;
        }
      });
      if (changed) saveDatabase(data);
      return logs
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },

    async record(identifier: string, code: string, expiresAt: number): Promise<OtpLogEntry> {
      const data = loadDatabase();
      if (!data.otpLogs) data.otpLogs = [];
      const entry: OtpLogEntry = {
        id: `otp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        identifier: identifier.trim().toLowerCase(),
        code,
        createdAt: new Date().toISOString(),
        expiresAt,
        status: "pending",
      };
      data.otpLogs.unshift(entry);
      if (data.otpLogs.length > 150) {
        data.otpLogs = data.otpLogs.slice(0, 150);
      }
      saveDatabase(data);
      return entry;
    },

    async markVerified(identifier: string): Promise<void> {
      const data = loadDatabase();
      if (!data.otpLogs) return;
      const norm = identifier.trim().toLowerCase();
      let changed = false;
      const nowStr = new Date().toISOString();
      data.otpLogs.forEach((entry) => {
        if (entry.identifier === norm && entry.status === "pending") {
          entry.status = "verified";
          entry.verifiedAt = nowStr;
          changed = true;
        }
      });
      if (changed) saveDatabase(data);
    },

    async clear(): Promise<void> {
      const data = loadDatabase();
      data.otpLogs = [];
      saveDatabase(data);
    },
  },
};
