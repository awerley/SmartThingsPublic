"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { RequireRole } from "@/components/AuthProvider";
import { ErrorNote, Field, PageHeader, useApi } from "@/components/ui";

export default function NewAd() {
  return (
    <RequireRole roles={["HOST"]}>
      <NewAdForm />
    </RequireRole>
  );
}

function NewAdForm() {
  const catalog = useApi<{ taskTypes: any[] }>("/api/catalog");
  const props = useApi<{ properties: any[] }>("/api/properties");
  const [f, setF] = useState({ taskTypeId: "", propertyId: "", title: "", description: "", zip: "", budget: "", rateType: "FLAT", recurring: false, frequency: "WEEKLY", preferredDate: "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const prop = props.data?.properties.find((p) => p.id === f.propertyId);
    try {
      const { ad } = await api("/api/wanted-ads", {
        body: {
          taskTypeId: f.taskTypeId,
          propertyId: f.propertyId || null,
          title: f.title,
          description: f.description,
          zip: prop?.zip ?? f.zip,
          budgetCents: f.budget ? Math.round(Number(f.budget) * 100) : null,
          rateType: f.budget ? f.rateType : null,
          recurring: f.recurring,
          frequency: f.recurring ? f.frequency : null,
          preferredDate: f.preferredDate ? new Date(`${f.preferredDate}T12:00`).toISOString() : null,
        },
      });
      window.location.href = `/wanted/${ad.id}`;
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl">
      <PageHeader title="Post a Sidekick Wanted ad" subtitle="Describe the help you need. Sidekicks in the area can find and message you." />
      <div className="card space-y-4">
        <ErrorNote error={err} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Task">
            <select className="input" required value={f.taskTypeId} onChange={set("taskTypeId")}>
              <option value="">Choose…</option>
              {catalog.data?.taskTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Property">
            <select className="input" value={f.propertyId} onChange={set("propertyId")}>
              <option value="">Not listed / other</option>
              {props.data?.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
        {!f.propertyId && (
          <Field label="ZIP code"><input className="input" required pattern="\d{5}" value={f.zip} onChange={set("zip")} /></Field>
        )}
        <Field label="Headline"><input className="input" required minLength={3} placeholder="Weekly lawn mowing for beach house" value={f.title} onChange={set("title")} /></Field>
        <Field label="Details"><textarea className="input" required minLength={10} rows={5} value={f.description} onChange={set("description")} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Budget ($, optional)"><input className="input" type="number" min="0" step="1" value={f.budget} onChange={set("budget")} /></Field>
          <Field label="Budget is">
            <select className="input" value={f.rateType} onChange={set("rateType")}>
              <option value="FLAT">Per visit (flat)</option>
              <option value="HOURLY">Per hour</option>
            </select>
          </Field>
          <Field label="Start date"><input className="input" type="date" value={f.preferredDate} onChange={set("preferredDate")} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.recurring} onChange={(e) => setF({ ...f, recurring: e.target.checked })} /> This is recurring work
          {f.recurring && (
            <select className="input ml-2 w-auto" value={f.frequency} onChange={set("frequency")}>
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Every 2 weeks</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          )}
        </label>
        <button className="btn-accent">Publish ad</button>
      </div>
    </form>
  );
}
