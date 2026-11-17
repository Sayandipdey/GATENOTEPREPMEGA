"use client";

import { useState } from "react";

interface SignupPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export function SignupChart({ data }: { data: SignupPoint[] }) {
  const [hoveredPoint, setHoveredPoint] = useState<SignupPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs font-mono text-gray-500 bg-gray-900 rounded-xl border border-gray-800">
        No signup history recorded yet.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.count), 5);
  const width = 800;
  const height = 240;
  const padding = 40;

  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - (d.count / maxVal) * (height - 2 * padding);
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, curr, i) => {
    return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-mono text-sm font-semibold text-white">
            User Registrations (Last 30 Days)
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Daily verified user signups
          </p>
        </div>

        {hoveredPoint && (
          <div className="px-3 py-1 bg-gray-800 border border-indigo-500/40 rounded text-xs font-mono text-indigo-300">
            {hoveredPoint.date}: <span className="font-bold">{hoveredPoint.count} signups</span>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[600px] select-none"
        >
          <defs>
            <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = height - padding - pct * (height - 2 * padding);
            const val = Math.round(pct * maxVal);
            return (
              <g key={idx}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#1f2937"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  fill="#6b7280"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#signupGradient)" />

          {/* Main stroke line */}
          <path
            d={pathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive dots */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint?.date === pt.data.date ? 6 : 3}
              fill={hoveredPoint?.date === pt.data.date ? "#818cf8" : "#4f46e5"}
              stroke="#030712"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredPoint(pt.data)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* X Axis Date labels (sample 5 dates) */}
          {[0, 7, 14, 21, 29].map((idx) => {
            if (!data[idx]) return null;
            const pt = points[idx];
            return (
              <text
                key={idx}
                x={pt.x}
                y={height - 15}
                fill="#6b7280"
                fontSize="10"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {data[idx].date.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
