"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorText, Field, Input, Select } from "@/components/ui";
import { DEPARTMENTS } from "@/lib/validation";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error, please try again");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isSignup && (
        <Field label="Full name">
          <Input name="name" required autoComplete="name" />
        </Field>
      )}
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Password">
        <Input
          name="password"
          type="password"
          required
          minLength={isSignup ? 8 : undefined}
          autoComplete={isSignup ? "new-password" : "current-password"}
        />
      </Field>
      {isSignup && (
        <>
          <Field label="Department">
            <Select name="department" required defaultValue="">
              <option value="" disabled>
                Select your department
              </option>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="I am a">
            <Select name="role" defaultValue="STUDENT">
              <option value="STUDENT">Student / project team member</option>
              <option value="OWNER">Lab in-charge / equipment owner</option>
            </Select>
          </Field>
        </>
      )}
      <ErrorText>{error}</ErrorText>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-slate-600">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-indigo-600 hover:underline"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
