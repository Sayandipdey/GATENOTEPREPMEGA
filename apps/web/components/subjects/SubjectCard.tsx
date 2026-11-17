import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { Subject } from "@notes/shared";

interface SubjectCardProps {
  subject: Subject;
  itemCount?: number;
}

export function SubjectCard({ subject, itemCount }: SubjectCardProps) {
  // Generate a consistent monogram / initials for subjects without thumbnail
  const initials = subject.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const categoryColor: Record<string, "indigo" | "blue" | "green" | "purple" | "gray"> = {
    Core: "indigo",
    "Engineering Mathematics": "purple",
    Maths: "purple",
    "General Aptitude": "green",
    Aptitude: "green",
  };

  const badgeVariant = categoryColor[subject.category || "Core"] || "indigo";

  return (
    <Link
      href={`/subjects/${subject.id}`}
      className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-indigo-500/50 transition-all duration-200 shadow-sm hover:shadow-indigo-500/10 hover:-translate-y-0.5 overflow-hidden justify-between"
    >
      <div>
        {/* Top thumbnail banner: exactly 96px (h-24) with a distinct background container */}
        <div className="relative h-24 w-full bg-slate-950/80 border-b border-slate-800/60 overflow-hidden flex items-center justify-center">
          {subject.thumbnailUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={subject.thumbnailUrl}
              alt={subject.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-950/50 via-slate-900/80 to-slate-950 flex items-center justify-center relative">
              {/* Subtle background monogram watermark */}
              <span className="font-mono text-3xl font-bold text-indigo-400/25 select-none tracking-widest">
                {initials || "GT"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
            </div>
          )}

          {/* Floating Category Badge */}
          {subject.category && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <Badge variant={badgeVariant} size="sm">
                {subject.category}
              </Badge>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4">
          <h3 className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1 text-base">
            {subject.name}
          </h3>

          {subject.description ? (
            <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {subject.description}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500 italic">GATE Exam Subject Notes</p>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="mx-4 mb-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="font-mono text-[11px] text-slate-400">
          {typeof itemCount === "number" ? `${itemCount} notes` : "View notes & diagrams"}
        </span>
        <div className="flex items-center font-medium text-indigo-400 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-transform">
          Open
          <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
