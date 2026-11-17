import type { Folder, Item, SheetRowData } from "@notes/shared";

/**
 * Calculates a fractional order value between two existing order values.
 * Allows inserting/moving rows without re-indexing the entire collection.
 */
export function getFractionalBetween(prev?: number, next?: number): number {
  if (prev === undefined && next === undefined) {
    return 1000;
  }
  if (prev === undefined && next !== undefined) {
    return next > 0 ? next / 2 : next - 1000;
  }
  if (prev !== undefined && next === undefined) {
    return prev + 1000;
  }
  if (prev !== undefined && next !== undefined) {
    if (prev === next) {
      return prev + 0.5;
    }
    return (prev + next) / 2;
  }
  return 1000;
}

/**
 * Normalizes an array of items to cleanly spaced integer order values.
 */
export function normalizeOrderList<T extends { id: string; order: number }>(
  list: T[]
): { id: string; order: number }[] {
  const sorted = [...list].sort((a, b) => a.order - b.order);
  return sorted.map((item, index) => ({
    id: item.id,
    order: (index + 1) * 1000,
  }));
}

/**
 * Builds a path map: folderId -> "Folder/Subfolder"
 */
export function buildFolderPathMap(folders: Folder[]): Map<string, string> {
  const folderMap = new Map(folders.map((f) => [f.id, f]));
  const pathMap = new Map<string, string>();

  function resolvePath(folderId: string): string {
    if (pathMap.has(folderId)) return pathMap.get(folderId)!;
    const folder = folderMap.get(folderId);
    if (!folder) return "";

    const parentPath = folder.parentId ? resolvePath(folder.parentId) : "";
    const fullPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;
    pathMap.set(folderId, fullPath);
    return fullPath;
  }

  for (const folder of folders) {
    resolvePath(folder.id);
  }

  return pathMap;
}

/**
 * Flattens folders and items into an indented tree list for the spreadsheet editor.
 */
export function flattenTreeForSheet(
  folders: Folder[],
  items: Item[],
  collapsedFolderIds: Set<string> = new Set()
): SheetRowData[] {
  const pathMap = buildFolderPathMap(folders);

  // Group folders and items by parent folder
  const foldersByParent = new Map<string | null, Folder[]>();
  const itemsByFolder = new Map<string | null, Item[]>();

  for (const f of folders) {
    const parentKey = f.parentId || null;
    const group = foldersByParent.get(parentKey) || [];
    group.push(f);
    foldersByParent.set(parentKey, group);
  }

  for (const it of items) {
    const folderKey = it.folderId || null;
    const group = itemsByFolder.get(folderKey) || [];
    group.push(it);
    itemsByFolder.set(folderKey, group);
  }

  // Sort each group by order
  foldersByParent.forEach((list) => list.sort((a, b) => a.order - b.order));
  itemsByFolder.forEach((list) => list.sort((a, b) => a.order - b.order));

  const result: SheetRowData[] = [];

  function traverse(folderId: string | null, depth: number) {
    const subFolders = foldersByParent.get(folderId) || [];
    const folderItems = itemsByFolder.get(folderId) || [];

    // 1. Add subfolders at this level
    for (const f of subFolders) {
      const isExpanded = !collapsedFolderIds.has(f.id);
      result.push({
        id: f.id,
        kind: "folder",
        subjectId: f.subjectId,
        folderId: f.parentId || null,
        title: f.name,
        order: f.order,
        isPublished: true,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt || f.createdAt,
        depth,
        folderPath: pathMap.get(f.id) || f.name,
        isExpanded,
      });

      // If folder is expanded, traverse its children
      if (isExpanded) {
        traverse(f.id, depth + 1);
      }
    }

    // 2. Add items at this level
    for (const it of folderItems) {
      result.push({
        id: it.id,
        kind: it.kind,
        subjectId: it.subjectId,
        folderId: it.folderId || null,
        title: it.title,
        megaFileLink: it.megaFileLink,
        type: it.type || "pdf",
        imageUrl: it.imageUrl,
        caption: it.caption,
        order: it.order,
        isPublished: it.isPublished,
        viewCount: it.viewCount || 0,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt || it.createdAt,
        linkStatus: it.linkStatus || "unknown",
        lastCheckedAt: it.lastCheckedAt,
        depth,
        folderPath: it.folderId ? (pathMap.get(it.folderId) || "") : "Root",
      });
    }
  }

  // Traverse from root (parentId: null)
  traverse(null, 0);

  return result;
}
