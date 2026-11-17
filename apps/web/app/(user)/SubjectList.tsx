"use client";

import { useState, useMemo } from "react";
import { SubjectCard } from "@/components/subjects/SubjectCard";
import { Chip } from "@/components/ui/Chip";
import { ItemRow } from "@/components/notes/ItemRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { GATE_CATEGORIES } from "@notes/shared";
import type { Subject, Item } from "@notes/shared";

interface SubjectWithCount extends Subject {
  itemCount: number;
}

interface SubjectListProps {
  initialSubjects: SubjectWithCount[];
  initialRecentItems: (Item & { viewedAt: string })[];
}

export function SubjectList({
  initialSubjects,
  initialRecentItems,
}: SubjectListProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Calculate counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: initialSubjects.length };
    initialSubjects.forEach((sub) => {
      const cat = sub.category || "Core";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [initialSubjects]);

  const filteredSubjects = useMemo(() => {
    return initialSubjects.filter((s) => {
      const matchesCategory =
        selectedCategory === "All" ||
        (s.category || "Core").toLowerCase() === selectedCategory.toLowerCase();

      if (!matchesCategory) return false;
      if (!search.trim()) return true;

      const term = search.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(term) ||
        (s.description && s.description.toLowerCase().includes(term)) ||
        (s.category && s.category.toLowerCase().includes(term))
      );
    });
  }, [initialSubjects, search, selectedCategory]);

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Hero / Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-medium mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            GATE Exam Revision Hub
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Subjects & High-Yield Notes
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-xl leading-relaxed">
            Curated revision notes, formula cheat sheets, and structural diagrams for Signals, Networks, Mathematics, and Aptitude.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects or topics..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {GATE_CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            active={selectedCategory === cat}
            count={categoryCounts[cat] || 0}
            onClick={() => setSelectedCategory(cat)}
          />
        ))}
      </div>

      {/* Recent "Continue where you left off" row (if any) */}
      {!search && selectedCategory === "All" && initialRecentItems.length > 0 && (
        <section className="flex flex-col gap-3 p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <polyline points="12 6 12 12 16 14" strokeWidth="2" />
              </svg>
              Continue where you left off
            </h2>
            <a href="/recent" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              View all history →
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            {initialRecentItems.slice(0, 2).map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Subjects Grid */}
      {filteredSubjects.length === 0 ? (
        <EmptyState
          title="No subjects match your criteria"
          description={
            search
              ? `No subjects found for "${search}". Try searching another keyword or clearing the filter.`
              : `No published subjects available under category "${selectedCategory}".`
          }
          action={
            search || selectedCategory !== "All"
              ? {
                  label: "Reset filters",
                  onClick: () => {
                    setSearch("");
                    setSelectedCategory("All");
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((sub) => (
            <SubjectCard
              key={sub.id}
              subject={sub}
              itemCount={sub.itemCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
