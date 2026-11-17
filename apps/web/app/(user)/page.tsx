import { Suspense } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { COOKIE_NAME } from "@notes/shared";
import { verifySession } from "@/lib/session";
import { SubjectList } from "./SubjectList";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Subject, Item } from "@notes/shared";

export const dynamic = "force-dynamic";

async function getInitialData(): Promise<{
  subjects: (Subject & { itemCount: number })[];
  recentItems: (Item & { viewedAt: string })[];
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;

    const subjects = await db.subjects.list(true);
    const subjectsWithCounts = await Promise.all(
      subjects.map(async (sub) => {
        const items = await db.items.listBySubject(sub.id, true);
        return {
          ...sub,
          itemCount: items.length,
        };
      })
    );

    let recentItems: (Item & { viewedAt: string })[] = [];
    if (session?.userId) {
      recentItems = await db.recent.list(session.userId, 4);
    }

    return { subjects: subjectsWithCounts, recentItems };
  } catch (error) {
    console.error("Failed to fetch initial home data:", error);
    return { subjects: [], recentItems: [] };
  }
}

function SubjectGridSkeleton() {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { subjects, recentItems } = await getInitialData();

  return (
    <Suspense fallback={<SubjectGridSkeleton />}>
      <SubjectList initialSubjects={subjects} initialRecentItems={recentItems} />
    </Suspense>
  );
}
