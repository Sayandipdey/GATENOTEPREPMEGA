import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SubjectDetailView } from "./SubjectDetailView";
import type { Subject, Folder, Item } from "@notes/shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SubjectPageProps {
  params: { id: string };
}

async function getSubjectData(id: string): Promise<{
  subject: Subject;
  folders: Folder[];
  items: Item[];
} | null> {
  try {
    const subject = await db.subjects.get(id);
    if (!subject || !subject.isPublished) return null;

    const folders = await db.folders.listBySubject(id);
    const items = await db.items.listBySubject(id, true);

    return { subject, folders, items };
  } catch (error) {
    console.error("Error loading subject page:", error);
    return null;
  }
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const data = await getSubjectData(params.id);
  if (!data) notFound();

  return (
    <SubjectDetailView
      subject={data.subject}
      folders={data.folders}
      items={data.items}
    />
  );
}
