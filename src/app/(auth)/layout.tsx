import Link from "next/link";
import { Card } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <Link href="/" className="text-center text-xl font-bold text-indigo-700">
        Campus Lab Share
      </Link>
      <Card>{children}</Card>
    </main>
  );
}
