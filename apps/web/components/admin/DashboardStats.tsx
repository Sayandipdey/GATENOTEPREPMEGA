interface StatsData {
  totalUsers: number;
  totalSubjects: number;
  totalNotes: number;
  totalViews: number;
  active24h: number;
  active7d: number;
}

export function DashboardStats({ stats }: { stats: StatsData }) {
  const cards = [
    {
      label: "TOTAL REGISTERED USERS",
      value: stats.totalUsers.toLocaleString(),
      subtext: `${stats.active24h} active today • ${stats.active7d} active 7d`,
      border: "border-indigo-500/30",
      accent: "text-indigo-400",
    },
    {
      label: "TOTAL SUBJECTS",
      value: stats.totalSubjects.toLocaleString(),
      subtext: "Across all semester courses",
      border: "border-emerald-500/30",
      accent: "text-emerald-400",
    },
    {
      label: "TOTAL STUDY NOTES",
      value: stats.totalNotes.toLocaleString(),
      subtext: "Hosted on MEGA cloud",
      border: "border-sky-500/30",
      accent: "text-sky-400",
    },
    {
      label: "TOTAL NOTE VIEWS",
      value: stats.totalViews.toLocaleString(),
      subtext: "Cumulative document reads",
      border: "border-amber-500/30",
      accent: "text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`p-5 bg-gray-900 border ${c.border} rounded-xl shadow-sm space-y-2`}
        >
          <p className="text-[11px] font-mono tracking-wider text-gray-400 font-semibold">
            {c.label}
          </p>
          <p className={`text-3xl font-mono font-bold tracking-tight ${c.accent}`}>
            {c.value}
          </p>
          <p className="text-xs text-gray-400 font-mono">{c.subtext}</p>
        </div>
      ))}
    </div>
  );
}
