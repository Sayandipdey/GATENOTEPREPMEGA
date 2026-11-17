import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SubjectExplorer } from "./SubjectExplorer";
import type { Subject, Folder, Item } from "@notes/shared";

export const dynamic = "force-dynamic";

interface AdminSubjectPageProps {
  params: { id: string };
}

async function getSubjectWithFoldersAndItems(id: string): Promise<{
  subject: Subject;
  folders: Folder[];
  items: Item[];
} | null> {
  try {
    const subject = await db.subjects.get(id);
    if (!subject) return null;

    const folders = await db.folders.listBySubject(id);
    const items = await db.items.listBySubject(id, false); // admin gets draft + published

    return { subject, folders, items };
  } catch (error) {
    console.error("Failed to load admin subject:", error);
    return null;
  }
}

export default async function AdminSubjectDetailPage({
  params,
}: AdminSubjectPageProps) {
  const data = await getSubjectWithFoldersAndItems(params.id);
  if (!data) notFound();

  return (
    <SubjectExplorer
      subject={data.subject}
      initialFolders={data.folders}
      initialItems={data.items}
    />
  );
}
