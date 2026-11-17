import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { COOKIE_NAME } from "@notes/shared";
import { Sidebar } from "@/components/admin/Sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    redirect("/login?from=/admin");
  }

  if (session.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md p-8 bg-gray-900 border border-red-900/60 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 bg-red-950 text-red-400 rounded-xl flex items-center justify-center mx-auto text-2xl font-mono font-bold">
            403
          </div>
          <h1 className="text-xl font-mono font-bold text-white">Access Denied</h1>
          <p className="text-sm text-gray-400">
            Your account ({session.identifier}) is not authorized to access the Admin Panel.
            An administrator must grant you permission via ADMIN_IDENTIFIERS or user promotion.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono rounded-lg transition-colors"
          >
            ← Return to Student Website
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col md:flex-row font-sans">
      <Sidebar adminEmail={session.identifier} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <header className="h-16 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs text-gray-400">Environment: Production (Vercel)</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
            <span>DB: Firestore Native</span>
            <span className="text-gray-700">•</span>
            <span>Auth: Phone.email OTP</span>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
