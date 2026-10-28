import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Campus Lab Share</h1>
      <p className="text-lg text-slate-600">
        Book underused lab equipment, workshop tools and project spaces across your
        college, with fair allocation and a full audit trail.
      </p>
      <div className="flex gap-3">
        {user ? (
          <Link
            href="/dashboard"
            className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
          >
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100"
            >
              Create account
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
