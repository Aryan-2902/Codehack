import Link from "next/link";
import { Card } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-float absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-300/40 blur-3xl" />
        <div
          className="animate-float absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl"
          style={{ animationDelay: "-7s" }}
        />
      </div>
      <Link
        href="/"
        className="animate-fade-in text-center text-xl font-bold text-indigo-700"
      >
        Campus Lab Share
      </Link>
      <div className="animate-pop-in" style={{ "--i": 1 } as React.CSSProperties}>
        <Card>{children}</Card>
      </div>
    </main>
  );
}
