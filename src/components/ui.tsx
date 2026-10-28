import type { ComponentProps, ReactNode } from "react";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={inputClass} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={inputClass} />;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "ghost" }) {
  const styles =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700"
      : "text-slate-600 hover:bg-slate-100";
  return (
    <button
      {...props}
      className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}

const roleStyles: Record<string, string> = {
  STUDENT: "bg-sky-100 text-sky-800",
  OWNER: "bg-emerald-100 text-emerald-800",
  MANAGER: "bg-amber-100 text-amber-800",
  ADMIN: "bg-rose-100 text-rose-800",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleStyles[role] ?? ""}`}
    >
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}
