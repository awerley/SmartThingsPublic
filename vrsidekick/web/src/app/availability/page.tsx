"use client";

import { useEffect, useState } from "react";
import { api, fmtDate, fmtDateTime, fmtTime, toDateInput } from "@/lib/client";
import { RequireRole } from "@/components/AuthProvider";
import { Empty, ErrorNote, Field, Loading, PageHeader, useApi } from "@/components/ui";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type Rule = { dayOfWeek: number; start: string; end: string };

const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export default function Availability() {
  return (
    <RequireRole roles={["SIDEKICK"]}>
      <AvailabilityInner />
    </RequireRole>
  );
}

function AvailabilityInner() {
  const { data, reload } = useApi<any>("/api/me/availability");
  const [rules, setRules] = useState<Rule[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ex, setEx] = useState({ kind: "BLOCK", date: toDateInput(new Date()), endDate: "", start: "09:00", end: "12:00", reason: "" });

  useEffect(() => {
    if (data) setRules(data.rules.map((r: any) => ({ dayOfWeek: r.dayOfWeek, start: toHHMM(r.startMinute), end: toHHMM(r.endMinute) })));
  }, [data]);

  if (!data) return <Loading />;

  async function saveRules() {
    setErr(null);
    try {
      await api("/api/me/availability", {
        method: "PUT",
        body: { rules: rules.map((r) => ({ dayOfWeek: r.dayOfWeek, startMinute: toMin(r.start), endMinute: r.end === "00:00" ? 1440 : toMin(r.end) })) },
      });
      setMsg("Weekly schedule saved.");
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function addException(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/api/me/availability/exceptions", {
        body: {
          kind: ex.kind,
          startAt: new Date(`${ex.date}T${ex.start}`).toISOString(),
          endAt: new Date(`${ex.endDate || ex.date}T${ex.end}`).toISOString(),
          reason: ex.reason || undefined,
        },
      });
      setEx({ ...ex, reason: "" });
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const byDay = new Map<string, any[]>();
  for (const w of data.windows) {
    const k = toDateInput(new Date(w.start));
    byDay.set(k, [...(byDay.get(k) ?? []), w]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability"
        subtitle={`Times are in ${data.timezone}. Booked jobs (plus your ${data.travelBufferMins}-minute travel buffer) are removed automatically.`}
      />
      {msg && <div className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</div>}
      <ErrorNote error={err} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-bold text-navy-900">Standard weekly schedule</h2>
          <div className="divide-y">
            {DAYS.map((name, i) => {
              const day = i + 1;
              const dayRules = rules.map((r, idx) => ({ r, idx })).filter((x) => x.r.dayOfWeek === day);
              return (
                <div key={day} className="flex flex-wrap items-start gap-3 py-2">
                  <span className="w-24 pt-2 text-sm font-medium">{name}</span>
                  <div className="flex-1 space-y-1">
                    {dayRules.length === 0 && <span className="block pt-2 text-sm text-gray-400">Unavailable</span>}
                    {dayRules.map(({ r, idx }) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="input w-28" type="time" value={r.start} onChange={(e) => setRules(rules.map((x, j) => (j === idx ? { ...x, start: e.target.value } : x)))} />
                        <span>–</span>
                        <input className="input w-28" type="time" value={r.end} onChange={(e) => setRules(rules.map((x, j) => (j === idx ? { ...x, end: e.target.value } : x)))} />
                        <button className="text-flame-600" onClick={() => setRules(rules.filter((_, j) => j !== idx))} aria-label="Remove">✕</button>
                      </div>
                    ))}
                  </div>
                  <button className="pt-2 text-sm font-semibold text-navy-700" onClick={() => setRules([...rules, { dayOfWeek: day, start: "09:00", end: "17:00" }])}>+ Add</button>
                </div>
              );
            })}
          </div>
          <button className="btn-primary mt-4" onClick={saveRules}>Save weekly schedule</button>
        </section>

        <section className="space-y-6">
          <form onSubmit={addException} className="card space-y-3">
            <h2 className="font-bold text-navy-900">Block time or add one-off availability</h2>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={ex.kind === "BLOCK"} onChange={() => setEx({ ...ex, kind: "BLOCK" })} /> Block out (travel, appointment, time off)</label>
              <label className="flex items-center gap-2"><input type="radio" checked={ex.kind === "EXTRA"} onChange={() => setEx({ ...ex, kind: "EXTRA" })} /> Extra availability</label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="From date"><input className="input" type="date" required value={ex.date} onChange={(e) => setEx({ ...ex, date: e.target.value })} /></Field>
              <Field label="Start time"><input className="input" type="time" required value={ex.start} onChange={(e) => setEx({ ...ex, start: e.target.value })} /></Field>
              <Field label="To date"><input className="input" type="date" placeholder="same day" value={ex.endDate} onChange={(e) => setEx({ ...ex, endDate: e.target.value })} /></Field>
              <Field label="End time"><input className="input" type="time" required value={ex.end} onChange={(e) => setEx({ ...ex, end: e.target.value })} /></Field>
            </div>
            <Field label="Note"><input className="input" placeholder={ex.kind === "BLOCK" ? "Driving to Panama City" : "Open Saturday morning"} value={ex.reason} onChange={(e) => setEx({ ...ex, reason: e.target.value })} /></Field>
            <button className={ex.kind === "BLOCK" ? "btn-ghost" : "btn-accent"}>{ex.kind === "BLOCK" ? "Block this time" : "Add availability"}</button>
          </form>

          <div className="card">
            <h2 className="mb-3 font-bold text-navy-900">Upcoming changes</h2>
            {data.exceptions.length ? (
              <div className="space-y-2">
                {data.exceptions.map((e: any) => (
                  <div key={e.id} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${e.kind === "BLOCK" ? "bg-gray-100" : "bg-green-50"}`}>
                    <span>
                      <b>{e.kind === "BLOCK" ? "Blocked" : "Extra"}</b> {fmtDateTime(e.startAt)} – {fmtTime(e.endAt)} {e.reason && `· ${e.reason}`}
                    </span>
                    <button className="text-flame-600" onClick={async () => { await api(`/api/me/availability/exceptions/${e.id}`, { method: "DELETE" }); reload(); }}>✕</button>
                  </div>
                ))}
              </div>
            ) : <Empty>No one-off changes.</Empty>}
          </div>
        </section>
      </div>

      <section className="card">
        <h2 className="mb-3 font-bold text-navy-900">What hosts can book (next 2 weeks)</h2>
        {byDay.size ? (
          <div className="space-y-1">
            {[...byDay.entries()].map(([k, ws]) => (
              <div key={k} className="flex flex-wrap gap-2 text-sm">
                <span className="w-28 font-medium">{fmtDate(ws[0].start)}</span>
                {ws.map((w: any) => <span key={w.start} className="chip bg-green-100 text-green-900">{fmtTime(w.start)} – {fmtTime(w.end)}</span>)}
              </div>
            ))}
          </div>
        ) : <Empty>You have no open time in the next two weeks.</Empty>}
      </section>
    </div>
  );
}
