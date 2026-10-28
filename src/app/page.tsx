import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const highlights = [
  ["Discover", "Find equipment and spaces across every department."],
  ["Book fairly", "Eligibility checks, waitlists and transparent rules."],
  ["Stay accountable", "Condition photos and a full audit trail."],
];

export default async function Home() {
  const user = await getCurrentUser();
  const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float absolute left-[8%] top-[10%] h-80 w-80 rounded-full bg-indigo-300/40 blur-3xl" />
        <div
          className="animate-float absolute right-[6%] top-[30%] h-96 w-96 rounded-full bg-sky-300/40 blur-3xl"
          style={{ animationDelay: "-5s" }}
        />
        <div
          className="animate-float absolute bottom-[5%] left-[35%] h-72 w-72 rounded-full bg-violet-300/40 blur-3xl"
          style={{ animationDelay: "-9s" }}
        />
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        <p
          className="animate-fade-up inline-block rounded-full border border-indigo-200 bg-white/70 px-4 py-1 text-sm font-medium text-indigo-700 backdrop-blur"
          style={delay(0)}
        >
          Campus lab &amp; equipment sharing
        </p>
        <h1
          className="animate-fade-up text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl"
          style={delay(1)}
        >
          Unlock{" "}
          <span className="animate-gradient-text bg-gradient-to-r from-indigo-600 via-sky-500 to-violet-600 bg-clip-text text-transparent">
            underused
          </span>{" "}
          equipment
        </h1>
        <p className="animate-fade-up text-lg text-slate-600" style={delay(2)}>
          Book lab instruments, workshop tools and project spaces across your college, with
          fair allocation and a full audit trail.
        </p>
        <div className="animate-fade-up flex justify-center gap-3" style={delay(3)}>
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-600/30 transition hover:-translate-y-0.5 hover:bg-indigo-700 active:translate-y-0"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-600/30 transition hover:-translate-y-0.5 hover:bg-indigo-700 active:translate-y-0"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md border border-slate-300 bg-white/70 px-5 py-2.5 font-medium text-slate-700 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>

      <ul className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-3">
        {highlights.map(([title, text], i) => (
          <li
            key={title}
            className="animate-fade-up rounded-xl border border-white/60 bg-white/70 p-5 text-left shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg"
            style={delay(4 + i)}
          >
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
