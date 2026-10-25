"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { RequireRole } from "@/components/AuthProvider";
import { Empty, ErrorNote, Field, Loading, PageHeader, useApi } from "@/components/ui";

const blank = { name: "", address: "", city: "", state: "", zip: "", notes: "" };

export default function Properties() {
  return (
    <RequireRole roles={["HOST"]}>
      <PropertiesInner />
    </RequireRole>
  );
}

function PropertiesInner() {
  const { data, loading, reload } = useApi<{ properties: any[] }>("/api/properties");
  const [editing, setEditing] = useState<{ id?: string } & typeof blank | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { id, ...body } = editing;
    try {
      await api(id ? `/api/properties/${id}` : "/api/properties", { method: id ? "PUT" : "POST", body: { ...body, notes: body.notes || null } });
      setEditing(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditing({ ...editing!, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Properties"
        subtitle="Your rentals. The ZIP code is used to find Sidekicks who serve the area."
        actions={<button className="btn-primary" onClick={() => setEditing({ ...blank })}>+ Add property</button>}
      />
      {editing && (
        <form onSubmit={save} className="card mb-6 grid gap-3 sm:grid-cols-2">
          <ErrorNote error={err} />
          <Field label="Name"><input className="input" required placeholder="Seaside Cottage" value={editing.name} onChange={set("name")} /></Field>
          <Field label="Street address"><input className="input" required value={editing.address} onChange={set("address")} /></Field>
          <Field label="City"><input className="input" required value={editing.city} onChange={set("city")} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="State"><input className="input" required value={editing.state} onChange={set("state")} /></Field>
            <Field label="ZIP"><input className="input" required pattern="\d{5}" value={editing.zip} onChange={set("zip")} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes for Sidekicks" hint="Access instructions, lockbox, trash day, supply closet…">
              <textarea className="input" rows={3} value={editing.notes} onChange={set("notes")} />
            </Field>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary">Save</button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      {loading ? (
        <Loading />
      ) : data?.properties.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.properties.map((p) => (
            <div key={p.id} className="card">
              <h3 className="font-bold text-navy-900">🏠 {p.name}</h3>
              <p className="text-sm text-gray-600">{p.address}, {p.city}, {p.state} {p.zip}</p>
              {p.notes && <p className="mt-2 text-xs whitespace-pre-wrap text-gray-500">{p.notes}</p>}
              <div className="mt-3 flex gap-3 text-sm">
                <a href={`/search?zip=${p.zip}`} className="font-semibold text-navy-700">Find Sidekicks</a>
                <button className="text-gray-600" onClick={() => setEditing({ ...blank, ...p, notes: p.notes ?? "" })}>Edit</button>
                <button
                  className="text-flame-600"
                  onClick={async () => {
                    if (!confirm(`Delete ${p.name}? Its job history will be removed.`)) return;
                    await api(`/api/properties/${p.id}`, { method: "DELETE" });
                    reload();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Add your first rental property to start booking Sidekicks.</Empty>
      )}
    </div>
  );
}
