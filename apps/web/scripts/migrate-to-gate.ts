/**
 * @file migrate-to-gate.ts
 * @description Migration script to convert existing database data into the GATE Exam Notes format.
 * - Cleans subjects: removes semester/code, assigns default category (Core/Maths/Aptitude)
 * - Converts legacy notes into items with kind="file", preserving all views and MEGA links
 * - Creates folder structure support
 *
 * Run with: npx ts-node scripts/migrate-to-gate.ts
 */

import fs from "fs";
import path from "path";

function runMigration() {
  const dbPath = path.resolve(__dirname, "../data/db.json");
  if (!fs.existsSync(dbPath)) {
    console.log("No existing database file found at:", dbPath);
    console.log("Fresh GATE database will be automatically initialized when the app runs.");
    return;
  }

  const raw = fs.readFileSync(dbPath, "utf-8");
  const data = JSON.parse(raw);

  console.log("Starting migration to GATE exam schema...");
  let subjectsMigrated = 0;
  let itemsMigrated = 0;

  // 1. Migrate subjects
  if (data.subjects) {
    Object.keys(data.subjects).forEach((subId) => {
      const sub = data.subjects[subId];
      // Assign category if missing
      let category = sub.category || "Core";
      const lowerName = (sub.name || "").toLowerCase();
      if (lowerName.includes("math") || lowerName.includes("calculus") || lowerName.includes("algebra")) {
        category = "Engineering Mathematics";
      } else if (lowerName.includes("aptitude") || lowerName.includes("verbal") || lowerName.includes("reasoning")) {
        category = "General Aptitude";
      }

      data.subjects[subId] = {
        id: sub.id,
        name: sub.name,
        category,
        description: sub.description || "",
        thumbnailUrl: sub.thumbnailUrl || "",
        order: sub.order ?? 0,
        isPublished: sub.isPublished ?? true,
        createdAt: sub.createdAt || new Date().toISOString(),
      };
      subjectsMigrated++;
    });
  }

  // 2. Initialize folders
  if (!data.folders) {
    data.folders = {};
  }

  // 3. Migrate notes to items
  if (!data.items) {
    data.items = {};
  }
  if (data.notes) {
    Object.keys(data.notes).forEach((noteId) => {
      const note = data.notes[noteId];
      data.items[noteId] = {
        id: note.id,
        subjectId: note.subjectId,
        folderId: note.folderId || null,
        kind: note.kind || "file",
        title: note.title,
        type: note.type || "pdf",
        megaFileLink: note.megaFileLink || "",
        imageUrl: note.imageUrl || "",
        caption: note.caption || "",
        order: note.order ?? 0,
        isPublished: note.isPublished ?? true,
        viewCount: note.viewCount ?? 0,
        createdAt: note.createdAt || new Date().toISOString(),
      };
      itemsMigrated++;
    });
  }

  // Update stats
  data.stats = {
    totalUsers: Object.keys(data.users || {}).length,
    totalSubjects: Object.keys(data.subjects || {}).length,
    totalNotes: Object.keys(data.items || {}).length,
    totalViews: data.stats?.totalViews ?? 0,
  };

  // Write backup first
  fs.writeFileSync(path.resolve(__dirname, `../data/db.backup.${Date.now()}.json`), raw, "utf-8");
  // Write updated
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");

  console.log(`Migration complete! Successfully migrated ${subjectsMigrated} subjects and ${itemsMigrated} items.`);
}

runMigration();
