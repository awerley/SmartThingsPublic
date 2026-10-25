"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { RequireRole } from "@/components/AuthProvider";
import { ErrorNote, Loading, PageHeader, useApi } from "@/components/ui";

const KINDS = [
  ["task-types", "Task types"],
  ["skills", "Skills"],
  ["tools", "Tools"],
] as const;

export default function AdminCatalog() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <Catalog />
    </RequireRole>
  );
}

function Catalog() {
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("task-types");
  const { data, loading, reload } = useApi<{ items: any[] }>(`/api/admin/catalog/${kind}`);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const isTask = kind === "task-types";

  async function run(p: Promise<unknown>) {
    setErr(null);
    try {
      await p;
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Catalog" subtitle="Options available to Sidekicks and Hosts. Deactivate to hide without losing history." />
      <div className="mb-4 flex gap-2">
        {KINDS.map(([k, label]) => (
          <button key={k} className={k === kind ? "btn-primary" : "btn-ghost"} onClick={() => setKind(k)}>{label}</button>
        ))}
      </div>
      <form
        className="card mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(api(`/api/admin/catalog/${kind}`, { body: { name, ...(isTask ? { icon: icon || null, description: description || null, sortOrder: data?.items.length ?? 0 } : {}) } })).then(() => {
            setName("");
            setIcon("");
            setDescription("");
          });
        }}
      >
        {isTask && <input className="input w-16" placeholder="🧹" value={icon} onChange={(e) => setIcon(e.target.value)} />}
        <input className="input max-w-xs" required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        {isTask && <input className="input flex-1" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />}
        <button className="btn-accent">Add</button>
      </form>
      <ErrorNote error={err} />
      {loading ? <Loading /> : (
        <div className="card divide-y p-0">
          {data?.items.map((it) => (
            <div key={it.id} className={`flex flex-wrap items-center gap-3 p-3 ${it.active ? "" : "opacity-50"}`}>
              {isTask && <span className="w-6">{it.icon}</span>}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{it.name} {!it.active && <span className="text-xs text-gray-500">(inactive)</span>}</div>
                {it.description && <div className="text-xs text-gray-500">{it.description}</div>}
                <div className="text-xs text-gray-400">
                  {isTask ? `${it._count.sidekickTasks} sidekicks · ${it._count.jobs} jobs` : `${it._count.sidekicks} sidekicks`}
                </div>
              </div>
              <button
                className="text-xs font-semibold text-navy-700"
                onClick={() => {
                  const n = prompt("Rename", it.name);
                  if (n && n !== it.name) run(api(`/api/admin/catalog/${kind}/${it.id}`, { method: "PATCH", body: { name: n } }));
                }}
              >
                Rename
              </button>
              <button className="text-xs font-semibold text-navy-700" onClick={() => run(api(`/api/admin/catalog/${kind}/${it.id}`, { method: "PATCH", body: { active: !it.active } }))}>
                {it.active ? "Deactivate" : "Activate"}
              </button>
              <button className="text-xs text-flame-600" onClick={() => confirm(`Delete "${it.name}"?`) && run(api(`/api/admin/catalog/${kind}/${it.id}`, { method: "DELETE" }))}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
