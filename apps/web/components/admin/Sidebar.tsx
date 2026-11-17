"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  adminEmail: string;
}

export function Sidebar({ adminEmail }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: "Subjects",
      href: "/admin/subjects",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: "Excel / CSV Import",
      href: "/admin/import",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
    {
      label: "Allowed Users",
      href: "/admin/allowed-users",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col justify-between shrink-0 min-h-screen">
      <div className="flex flex-col">
        {/* Brand header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-mono font-bold text-white text-sm">
            &gt;_
          </div>
          <div>
            <h2 className="font-mono font-bold text-sm tracking-wide text-white uppercase">
              Admin Console
            </h2>
            <p className="text-[10px] text-gray-500 font-mono">v1.0.0 • production</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-mono transition-colors ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Account */}
      <div className="p-4 border-t border-gray-800 space-y-3">
        <div className="px-3 py-2 bg-gray-900 rounded-lg border border-gray-800/80">
          <p className="text-[10px] uppercase font-mono tracking-wider text-gray-500">
            Signed in as
          </p>
          <p className="text-xs font-mono text-gray-200 truncate mt-0.5" title={adminEmail}>
            {adminEmail}
          </p>
          <span className="inline-block mt-1.5 px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-mono rounded">
            ROLE: ADMIN
          </span>
        </div>

        <div className="flex items-center justify-between text-xs font-mono px-1">
          <Link
            href="/"
            className="text-gray-400 hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
          >
            ← Student View
          </Link>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
