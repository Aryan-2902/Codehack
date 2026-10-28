"use client";

import { useMemo, useState } from "react";
import { ErrorText, Input, RoleBadge, Select } from "@/components/ui";
import type { CurrentUser } from "@/lib/auth";

const ROLES = ["STUDENT", "OWNER", "MANAGER", "ADMIN"] as const;

export function PeopleTable({
  initialUsers,
  meId,
  isAdmin,
}: {
  initialUsers: CurrentUser[];
  meId: string;
  isAdmin: boolean;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [busyId, setBusyId] = useState<string>();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.department].some((v) => v.toLowerCase().includes(q)),
    );
  }, [users, query]);

  async function update(id: string, path: "verification" | "role", body: object) {
    setError(undefined);
    setBusyId(id);
    try {
      const res = await fetch(`/api/users/${id}/${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch {
      setError("Network error, please try again");
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by name, email or department"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ErrorText>{error}</ErrorText>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">ID verified</th>
              <th className="px-4 py-3 font-medium">Safety training</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-500">
                    {u.email} · {u.department}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <Select
                      aria-label={`Role for ${u.name}`}
                      value={u.role}
                      disabled={busyId === u.id || u.id === meId}
                      onChange={(e) => update(u.id, "role", { role: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.charAt(0) + r.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <RoleBadge role={u.role} />
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`ID verified for ${u.name}`}
                    checked={u.verified}
                    disabled={busyId === u.id}
                    onChange={(e) => update(u.id, "verification", { verified: e.target.checked })}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Safety trained for ${u.name}`}
                    checked={u.safetyTrained}
                    disabled={busyId === u.id}
                    onChange={(e) =>
                      update(u.id, "verification", { safetyTrained: e.target.checked })
                    }
                  />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No one matches that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
