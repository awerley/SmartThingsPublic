"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { RequireRole } from "@/components/AuthProvider";
import { ErrorNote, Field, Loading, PageHeader, useApi } from "@/components/ui";

type Catalog = { taskTypes: { id: string; name: string; icon: string | null }[]; skills: { id: string; name: string }[]; tools: { id: string; name: string }[] };
type TaskRow = { taskTypeId: string; rateType: "HOURLY" | "FLAT"; rate: string; notes: string };

const TIMEZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"];

export default function Profile() {
  return (
    <RequireRole roles={["SIDEKICK"]}>
      <ProfileEditor />
    </RequireRole>
  );
}

function ProfileEditor() {
  const catalog = useApi<Catalog>("/api/catalog");
  const mine = useApi<{ profile: any }>("/api/me/sidekick");
  const [p, setP] = useState<any>(null);
  const [tasks, setTasks] = useState<Map<string, TaskRow>>(new Map());
  const [skills, setSkills] = useState<Set<string>>(new Set());
  const [tools, setTools] = useState<Set<string>>(new Set());
  const [zipsText, setZipsText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => setWelcome(new URLSearchParams(window.location.search).has("welcome")), []);
  useEffect(() => {
    const prof = mine.data?.profile;
    if (!prof) return;
    setP(prof);
    setTasks(new Map(prof.tasks.map((t: any) => [t.taskTypeId, { taskTypeId: t.taskTypeId, rateType: t.rateType, rate: String(t.rateCents / 100), notes: t.notes ?? "" }])));
    setSkills(new Set(prof.skills.map((s: any) => s.id)));
    setTools(new Set(prof.tools.map((s: any) => s.id)));
    setZipsText(prof.serviceZips.join(", "));
  }, [mine.data]);

  if (!p || !catalog.data) return <Loading />;

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setter(n);
  };

  async function save() {
    setErr(null);
    setMsg(null);
    try {
      await api("/api/me/sidekick", {
        method: "PUT",
        body: {
          displayName: p.displayName,
          providerType: p.providerType,
          companyName: p.companyName || null,
          bio: p.bio || null,
          yearsExperience: p.yearsExperience === "" || p.yearsExperience == null ? null : Number(p.yearsExperience),
          insured: !!p.insured,
          baseZip: p.baseZip || null,
          serviceRadiusMiles: Number(p.serviceRadiusMiles),
          serviceZips: zipsText.split(/[\s,]+/).filter(Boolean),
          timezone: p.timezone,
          travelBufferMins: Number(p.travelBufferMins),
          published: p.published,
          tasks: [...tasks.values()].map((t) => ({ taskTypeId: t.taskTypeId, rateType: t.rateType, rateCents: Math.round(Number(t.rate) * 100), notes: t.notes || null })),
          skillIds: [...skills],
          toolIds: [...tools],
        },
      });
      setMsg("Profile saved.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErr((e as Error).message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setP({ ...p, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Your Sidekick profile"
        subtitle="What hosts see when they search."
        actions={<><Link href={`/sidekicks/${p.id}`} className="btn-ghost">View public profile</Link><button className="btn-primary" onClick={save}>Save profile</button></>}
      />
      {welcome && <div className="rounded-2xl bg-gold-300/30 p-4 text-sm">Welcome! Pick the tasks you offer with your rates, then set your <Link href="/availability" className="font-semibold underline">availability</Link>.</div>}
      {msg && <div className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</div>}
      <ErrorNote error={err} />

      <section className="card grid gap-4 sm:grid-cols-2">
        <Field label="Display name"><input className="input" value={p.displayName} onChange={set("displayName")} /></Field>
        <Field label="Provider type">
          <select className="input" value={p.providerType} onChange={set("providerType")}>
            <option value="INDIVIDUAL">Individual</option>
            <option value="COMPANY">Company</option>
          </select>
        </Field>
        {p.providerType === "COMPANY" && <Field label="Company name"><input className="input" value={p.companyName ?? ""} onChange={set("companyName")} /></Field>}
        <Field label="Years of experience"><input className="input" type="number" min="0" value={p.yearsExperience ?? ""} onChange={set("yearsExperience")} /></Field>
        <div className="sm:col-span-2">
          <Field label="About you"><textarea className="input" rows={4} value={p.bio ?? ""} onChange={set("bio")} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!p.insured} onChange={(e) => setP({ ...p, insured: e.target.checked })} /> I carry liability insurance</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.published} onChange={(e) => setP({ ...p, published: e.target.checked })} /> Show my profile in search</label>
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold text-navy-900">Service area</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Home base ZIP"><input className="input" pattern="\d{5}" value={p.baseZip ?? ""} onChange={set("baseZip")} /></Field>
          <Field label="Travel radius (miles)"><input className="input" type="number" min="1" max="250" value={p.serviceRadiusMiles} onChange={set("serviceRadiusMiles")} /></Field>
          <Field label="Timezone">
            <select className="input" value={p.timezone} onChange={set("timezone")}>
              {[...new Set([p.timezone, ...TIMEZONES])].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Additional ZIP codes served" hint="Comma-separated. Hosts in these ZIPs see you even if they're outside your radius.">
          <input className="input" value={zipsText} onChange={(e) => setZipsText(e.target.value)} />
        </Field>
        <Field label="Travel buffer between jobs (minutes)" hint="Automatically kept free before and after each scheduled job.">
          <input className="input w-40" type="number" min="0" max="240" value={p.travelBufferMins} onChange={set("travelBufferMins")} />
        </Field>
      </section>

      <section className="card">
        <h2 className="mb-1 font-bold text-navy-900">Tasks & rates</h2>
        <p className="mb-3 text-sm text-gray-500">Check each task you&apos;ll take on and set an hourly or flat rate.</p>
        <div className="divide-y">
          {catalog.data.taskTypes.map((t) => {
            const row = tasks.get(t.id);
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-3 py-2">
                <label className="flex w-64 items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={!!row}
                    onChange={() => {
                      const n = new Map(tasks);
                      if (row) n.delete(t.id);
                      else n.set(t.id, { taskTypeId: t.id, rateType: "HOURLY", rate: "40", notes: "" });
                      setTasks(n);
                    }}
                  />
                  {t.icon} {t.name}
                </label>
                {row && (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">$</span>
                      <input className="input w-24" type="number" min="1" step="0.01" value={row.rate} onChange={(e) => setTasks(new Map(tasks).set(t.id, { ...row, rate: e.target.value }))} />
                    </div>
                    <select className="input w-32" value={row.rateType} onChange={(e) => setTasks(new Map(tasks).set(t.id, { ...row, rateType: e.target.value as TaskRow["rateType"] }))}>
                      <option value="HOURLY">per hour</option>
                      <option value="FLAT">flat rate</option>
                    </select>
                    <input className="input min-w-40 flex-1" placeholder="Notes (e.g. up to 3BR)" value={row.notes} onChange={(e) => setTasks(new Map(tasks).set(t.id, { ...row, notes: e.target.value }))} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-bold text-navy-900">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {catalog.data.skills.map((s) => (
              <button key={s.id} type="button" onClick={() => toggle(skills, setSkills, s.id)} className={`rounded-full border px-3 py-1 text-xs ${skills.has(s.id) ? "border-navy-700 bg-navy-700 text-white" : "border-gray-300"}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="mb-3 font-bold text-navy-900">Tools & equipment</h2>
          <div className="flex flex-wrap gap-2">
            {catalog.data.tools.map((s) => (
              <button key={s.id} type="button" onClick={() => toggle(tools, setTools, s.id)} className={`rounded-full border px-3 py-1 text-xs ${tools.has(s.id) ? "border-navy-700 bg-navy-700 text-white" : "border-gray-300"}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </section>
      <button className="btn-primary" onClick={save}>Save profile</button>
    </div>
  );
}
