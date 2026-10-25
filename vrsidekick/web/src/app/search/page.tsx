"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { rateLabel } from "@/lib/client";
import { Avatar, Empty, Loading, PageHeader, Stars, useApi } from "@/components/ui";

type Catalog = { taskTypes: { id: string; name: string }[]; skills: { id: string; name: string }[]; tools: { id: string; name: string }[] };

export default function Search() {
  const catalog = useApi<Catalog>("/api/catalog");
  const props = useApi<{ properties: { id: string; name: string; zip: string }[] }>("/api/properties");
  const [f, setF] = useState({ zip: "", taskTypeId: "", skillId: "", toolId: "", q: "" });
  const [query, setQuery] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const init = { ...f, taskTypeId: sp.get("taskTypeId") ?? "", zip: sp.get("zip") ?? "" };
    setF(init);
    setQuery(new URLSearchParams(Object.entries(init).filter(([, v]) => v)).toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    // Default the ZIP to the host's first property.
    const first = props.data?.properties[0];
    if (first && !f.zip) {
      const next = { ...f, zip: first.zip };
      setF(next);
      setQuery(new URLSearchParams(Object.entries(next).filter(([, v]) => v)).toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.data]);

  const results = useApi<{ results: any[] }>(query === null ? null : `/api/sidekicks?${query}`);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div>
      <PageHeader title="Find a Sidekick" subtitle="Filter by your rental's service area and the work you need done." />
      <form
        className="card mb-6 grid gap-3 md:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString());
        }}
      >
        <div className="md:col-span-1">
          <span className="label">Rental ZIP</span>
          <input className="input" list="prop-zips" placeholder="32541" value={f.zip} onChange={set("zip")} />
          <datalist id="prop-zips">
            {props.data?.properties.map((p) => <option key={p.id} value={p.zip}>{p.name}</option>)}
          </datalist>
        </div>
        <div className="md:col-span-2">
          <span className="label">Task</span>
          <select className="input" value={f.taskTypeId} onChange={set("taskTypeId")}>
            <option value="">Any task</option>
            {catalog.data?.taskTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <span className="label">Skill</span>
          <select className="input" value={f.skillId} onChange={set("skillId")}>
            <option value="">Any</option>
            {catalog.data?.skills.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <span className="label">Tool</span>
          <select className="input" value={f.toolId} onChange={set("toolId")}>
            <option value="">Any</option>
            {catalog.data?.tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full">Search</button>
        </div>
      </form>

      {results.loading ? (
        <Loading />
      ) : results.data?.results.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {results.data.results.map((s) => {
            const task = s.tasks.find((t: any) => t.taskTypeId === f.taskTypeId) ?? s.tasks[0];
            return (
              <Link key={s.id} href={`/sidekicks/${s.id}`} className="card flex gap-4 hover:border-gold-400">
                <Avatar name={s.displayName} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-navy-900">{s.displayName}</span>
                    {s.providerType === "COMPANY" && <span className="chip">Company</span>}
                    {s.insured && <span className="chip">Insured</span>}
                  </div>
                  <Stars value={s.ratingAvg} count={s.ratingCount} />
                  {s.distanceMiles != null && <span className="ml-2 text-xs text-gray-500">{s.distanceMiles} mi away</span>}
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{s.bio}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.tasks.slice(0, 4).map((t: any) => <span key={t.id} className="chip">{t.taskType}</span>)}
                  </div>
                </div>
                {task && (
                  <div className="text-right text-sm font-bold whitespace-nowrap text-navy-700">{rateLabel(task.rateType, task.rateCents)}</div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty>
          No Sidekicks match yet. <Link href="/wanted/new" className="font-semibold text-navy-700">Post a Sidekick Wanted ad</Link> and let local pros find you.
        </Empty>
      )}
    </div>
  );
}
