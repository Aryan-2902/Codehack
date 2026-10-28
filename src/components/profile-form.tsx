"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorText, Field, Input, Select } from "@/components/ui";
import { DEPARTMENTS } from "@/lib/validation";

export function ProfileForm(props: { name: string; department: string; email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setSaved(false);
    setPending(true);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error, please try again");
    } finally {
      setPending(false);
    }
  }

  const departments = DEPARTMENTS.includes(props.department as never)
    ? DEPARTMENTS
    : [props.department, ...DEPARTMENTS];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email">
        <Input value={props.email} disabled readOnly />
      </Field>
      <Field label="Full name">
        <Input name="name" defaultValue={props.name} required />
      </Field>
      <Field label="Department">
        <Select name="department" defaultValue={props.department} required>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </Select>
      </Field>
      <ErrorText>{error}</ErrorText>
      {saved && <p className="text-sm text-emerald-700">Profile saved.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
