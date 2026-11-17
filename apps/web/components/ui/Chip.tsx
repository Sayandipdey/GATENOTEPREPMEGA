import React from "react";

interface ChipProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  active = false,
  count,
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border select-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
        active
          ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
          : "bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600"
      } ${className}`}
    >
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
            active
              ? "bg-indigo-700/80 text-white"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
