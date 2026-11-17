import { API_BASE_URL } from "./constants";
import { getToken, clearToken } from "./auth";

// ─── GATE Types ───────────────────────────────────────────────────────────────

export interface Subject {
  id: string;
  name: string;
  category?: string;
  description: string;
  thumbnailUrl?: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
  itemCount?: number;
}

export interface Folder {
  id: string;
  subjectId: string;
  parentId?: string | null;
  name: string;
  order: number;
  createdAt: string;
}

export type ItemKind = "file" | "image";
export type NoteFileType = "pdf" | "ppt" | "doc" | "other";

export interface Item {
  id: string;
  subjectId: string;
  folderId?: string | null;
  kind: ItemKind;
  title: string;
  type?: NoteFileType;
  megaFileLink?: string;
  imageUrl?: string;
  caption?: string;
  order: number;
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
}

export type Note = Item;

export interface BookmarkItem {
  itemId: string;
  noteId?: string;
  addedAt: string;
  note?: Item;
}

export interface RecentItem {
  itemId: string;
  noteId?: string;
  viewedAt: string;
  note?: Item;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (netErr: any) {
    throw new Error(
      `Network request failed: ${netErr.message ?? "check API URL"}`
    );
  }

  if (res.status === 401) {
    await clearToken();
    throw new Error("Session expired. Please log in again.");
  }

  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Server returned status ${res.status}`);
  }

  if (!res.ok || body.success === false) {
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }

  return body.data as T;
}

// ─── API Methods ─────────────────────────────────────────────────────────────

export async function getSubjects(): Promise<Subject[]> {
  return apiFetch<Subject[]>("/api/subjects");
}

export async function getSubjectDetails(
  id: string
): Promise<Subject & { folders: Folder[]; items: Item[] }> {
  return apiFetch<Subject & { folders: Folder[]; items: Item[] }>(
    `/api/subjects/${id}`
  );
}

export async function getNotesBySubject(subjectId: string): Promise<Item[]> {
  return apiFetch<Item[]>(`/api/subjects/${subjectId}/notes`);
}

export async function recordView(noteId: string): Promise<void> {
  try {
    await apiFetch(`/api/notes/${noteId}/view`, { method: "POST" });
  } catch {
    // Non-critical background call
  }
}

export const viewNote = recordView;

export async function getBookmarks(): Promise<Item[]> {
  return apiFetch<Item[]>("/api/bookmarks");
}

export async function toggleBookmark(
  id: string,
  action?: "add" | "remove"
): Promise<{ bookmarked: boolean }> {
  return apiFetch<{ bookmarked: boolean }>("/api/bookmarks", {
    method: "POST",
    body: JSON.stringify({ itemId: id, noteId: id, action }),
  });
}

export async function getRecent(): Promise<(Item & { viewedAt: string })[]> {
  return apiFetch<(Item & { viewedAt: string })[]>("/api/recent");
}

export async function getProfile(): Promise<{ id: string; email?: string; role: string }> {
  return apiFetch("/api/me");
}
