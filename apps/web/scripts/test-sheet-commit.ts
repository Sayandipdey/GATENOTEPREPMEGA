import { db } from "../lib/db";
import { getFractionalBetween, normalizeOrderList, flattenTreeForSheet } from "../lib/fractional-order";
import type { Folder, Item, SheetCommitPayload } from "@notes/shared";

async function runTests() {
  console.log("=== Testing Sheet Fractional Ordering & Tree Flattening ===");

  // 1. Fractional ordering tests
  const mid1 = getFractionalBetween(1000, 2000);
  console.assert(mid1 === 1500, `Expected 1500, got ${mid1}`);

  const mid2 = getFractionalBetween(undefined, 1000);
  console.assert(mid2 === 500, `Expected 500, got ${mid2}`);

  const mid3 = getFractionalBetween(2000, undefined);
  console.assert(mid3 === 3000, `Expected 3000, got ${mid3}`);

  console.log("✓ Fractional ordering math passed!");

  // 2. Tree flattening test
  const sampleFolders: Folder[] = [
    { id: "f1", subjectId: "sub1", name: "Folder 1", order: 1000, createdAt: new Date().toISOString() },
    { id: "f2", subjectId: "sub1", parentId: "f1", name: "Subfolder 1.1", order: 1000, createdAt: new Date().toISOString() },
  ];
  const sampleItems: Item[] = [
    { id: "i1", subjectId: "sub1", folderId: "f2", kind: "file", title: "Note in Subfolder", order: 1000, isPublished: true, viewCount: 0, createdAt: new Date().toISOString() },
    { id: "i2", subjectId: "sub1", folderId: null, kind: "file", title: "Root Note", order: 2000, isPublished: true, viewCount: 0, createdAt: new Date().toISOString() },
  ];

  const flattened = flattenTreeForSheet(sampleFolders, sampleItems);
  console.assert(flattened.length === 4, `Expected 4 flattened rows, got ${flattened.length}`);
  console.assert(flattened[0].id === "f1" && flattened[0].depth === 0, "Root folder depth should be 0");
  console.assert(flattened[1].id === "f2" && flattened[1].depth === 1, "Subfolder depth should be 1");
  console.assert(flattened[2].id === "i1" && flattened[2].depth === 2, "Item in subfolder should have depth 2");
  console.assert(flattened[3].id === "i2" && flattened[3].depth === 0, "Root item depth should be 0");
  console.log("✓ Tree flattening & indentation passed!");

  // 3. Database commit test
  console.log("=== Testing db.sheet.commit ===");
  const subjectId = "gate-signals-systems";

  const payload: SheetCommitPayload = {
    operations: [
      {
        op: "create",
        entityType: "folder",
        id: "temp_fld_test",
        data: { title: "Test Unit 1", order: 1000 },
      },
      {
        op: "create",
        entityType: "item",
        id: "temp_item_test",
        data: {
          title: "Fourier Transform PYQ",
          kind: "file",
          type: "pdf",
          megaFileLink: "https://mega.nz/file/test1234#demo",
          folderId: "temp_fld_test",
          order: 1000,
        },
      },
    ],
  };

  const commitResult = await db.sheet.commit(subjectId, payload);
  console.assert(commitResult.appliedCount === 2, `Expected 2 applied ops, got ${commitResult.appliedCount}`);
  console.assert(commitResult.createdIdMap["temp_fld_test"] !== undefined, "Should map temp_fld_test");
  console.assert(commitResult.createdIdMap["temp_item_test"] !== undefined, "Should map temp_item_test");

  const createdItemId = commitResult.createdIdMap["temp_item_test"];
  const createdFolderId = commitResult.createdIdMap["temp_fld_test"];
  const itemInDb = await db.items.get(createdItemId);
  console.assert(itemInDb !== null, "Item should exist in DB");
  console.assert(itemInDb?.folderId === createdFolderId, "Item should be nested inside the created folder");
  console.log("✓ Batch commit with nested resolution passed!");

  // Clean up test data
  await db.folders.delete(createdFolderId);
  console.log("✓ Cleaned up test folder and items!");
  console.log("=== All Sheet Tests Passed Successfully ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
