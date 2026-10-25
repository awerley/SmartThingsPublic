"use client";

import { useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { RequireRole } from "@/components/AuthProvider";
import { ErrorNote, Loading, PageHeader, StatusBadge, useApi } from "@/components/ui";

export default function AdminUsers() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <Users />
    </RequireRole>
  );
}

function Users() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const { data, loading, reload } = useApi<{ users: any[] }>(`/api/admin/users?${query}`);
  const [err, setErr] = useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setErr(null);
    try {
      await api(`/api/admin/users/${id}`, { method: "PATCH", body });
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader title="Users" subtitle="Suspend, reactivate, change roles or remove accounts." />
      <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(new URLSearchParams(Object.entries({ q, role }).filter(([, v]) => v)).toString()); }}>
        <input className="input max-w-xs" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-40" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="HOST">Hosts</option>
          <option value="SIDEKICK">Sidekicks</option>
          <option value="ADMIN">Admins</option>
        </select>
        <button className="btn-primary">Filter</button>
      </form>
      <ErrorNote error={err} />
      {loading ? <Loading /> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-left text-xs text-navy-700 uppercase">
              <tr>
                <th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Details</th><th className="p-3">Joined</th><th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.users.map((u) => (
                <tr key={u.id}>
                  <td className="p-3"><div className="font-medium">{u.name}</div><div className="text-xs text-gray-500">{u.email}</div></td>
                  <td className="p-3">
                    <select className="input w-32 py-1" value={u.role} onChange={(e) => confirm(`Change ${u.name} to ${e.target.value}?`) && patch(u.id, { role: e.target.value })}>
                      <option value="HOST">Host</option><option value="SIDEKICK">Sidekick</option><option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="p-3"><StatusBadge status={u.status} /></td>
                  <td className="p-3 text-xs text-gray-600">
                    {u.sidekick ? (
                      <>
                        {u.sidekick.displayName} · {u.sidekick.providerType.toLowerCase()} · ★{u.sidekick.ratingAvg}
                        <br />{u.sidekick.payoutsEnabled ? "payouts ✓" : "payouts ✗"} ·{" "}
                        <button className="underline" onClick={() => patch(u.id, { published: !u.sidekick.published })}>{u.sidekick.published ? "listed (hide)" : "hidden (list)"}</button>
                      </>
                    ) : u.role === "HOST" ? (
                      <>{u._count.properties} properties · {u._count.hostJobs} jobs · {u.hasPaymentMethod ? "card ✓" : "no card"}</>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs">{fmtDate(u.createdAt)}</td>
                  <td className="space-x-2 p-3 whitespace-nowrap">
                    {u.status === "ACTIVE" ? (
                      <button className="text-xs font-semibold text-flame-600" onClick={() => patch(u.id, { status: "SUSPENDED" })}>Suspend</button>
                    ) : (
                      <button className="text-xs font-semibold text-navy-700" onClick={() => patch(u.id, { status: "ACTIVE" })}>Reactivate</button>
                    )}
                    <button
                      className="text-xs text-gray-500"
                      onClick={async () => {
                        if (!confirm(`Permanently delete ${u.email} and all their data?`)) return;
                        await api(`/api/admin/users/${u.id}`, { method: "DELETE" }).catch((e) => setErr(e.message));
                        reload();
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
