import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { RoleBadge } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const canManagePeople = user.role !== "STUDENT";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 animate-fade-in border-b border-slate-200 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
          <Link href="/dashboard" className="text-base font-bold text-indigo-700">
            Campus Lab Share
          </Link>
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
            Dashboard
          </Link>
          <Link href="/resources" className="text-slate-600 hover:text-slate-900">
            Resources
          </Link>
          {canManagePeople && (
            <Link href="/people" className="text-slate-600 hover:text-slate-900">
              People
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2 hover:underline">
              <span className="font-medium">{user.name}</span>
              <RoleBadge role={user.role} />
            </Link>
            <LogoutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
