"use client";

import Link from "next/link";
import { useState } from "react";
import { api, fmtDate, money } from "@/lib/client";
import { RequireRole, useAuth } from "@/components/AuthProvider";
import { Empty, Loading, PageHeader, StatusBadge, useApi } from "@/components/ui";

export default function Wanted() {
  return (
    <RequireRole roles={["HOST", "SIDEKICK"]}>
      <WantedInner />
    </RequireRole>
  );
}

function AdRow({ ad, children }: { ad: any; children?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/wanted/${ad.id}`} className="font-bold text-navy-900 hover:underline">{ad.title}</Link>
        <StatusBadge status={ad.status} />
        <span className="chip">{ad.taskType.name}</span>
        {ad.recurring && <span className="chip">🔁 {ad.frequency?.toLowerCase() ?? "recurring"}</span>}
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{ad.description}</p>
      <div className="mt-2 text-xs text-gray-500">
        📍 {ad.property ? `${ad.property.city}, ${ad.property.state}` : ad.zip}
        {ad.distanceMiles != null && ` · ${ad.distanceMiles} mi`}
        {ad.budgetCents != null && ` · Budget ${money(ad.budgetCents)}${ad.rateType === "HOURLY" ? "/hr" : ""}`}
        {ad.preferredDate && ` · Starting ${fmtDate(ad.preferredDate)}`} · Posted {fmtDate(ad.createdAt)}
      </div>
      {children}
    </div>
  );
}

function WantedInner() {
  const { user } = useAuth();
  const isHost = user!.role === "HOST";
  const catalog = useApi<{ taskTypes: any[] }>("/api/catalog");
  const [taskTypeId, setTaskTypeId] = useState("");
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState("");
  const [q, setQ] = useState("");
  const { data, loading, reload } = useApi<{ ads: any[] }>(isHost ? "/api/wanted-ads?mine=1" : `/api/wanted-ads?${q}`);

  if (isHost) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="My Sidekick Wanted ads"
          subtitle="Local Sidekicks browse these and message you directly."
          actions={<Link href="/wanted/new" className="btn-accent">+ Post an ad</Link>}
        />
        {loading ? <Loading /> : data?.ads.length ? (
          <div className="space-y-3">
            {data.ads.map((ad) => (
              <AdRow key={ad.id} ad={ad}>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <span className="text-gray-600">💬 {ad._count.conversations} responses</span>
                  {ad.status === "OPEN" && (
                    <button className="font-semibold text-navy-700" onClick={async () => { await api(`/api/wanted-ads/${ad.id}`, { method: "PATCH", body: { status: "FILLED" } }); reload(); }}>
                      Mark filled
                    </button>
                  )}
                  {ad.status !== "OPEN" && (
                    <button className="font-semibold text-navy-700" onClick={async () => { await api(`/api/wanted-ads/${ad.id}`, { method: "PATCH", body: { status: "OPEN" } }); reload(); }}>
                      Reopen
                    </button>
                  )}
                  <button className="text-flame-600" onClick={async () => { if (confirm("Delete this ad?")) { await api(`/api/wanted-ads/${ad.id}`, { method: "DELETE" }); reload(); } }}>
                    Delete
                  </button>
                </div>
              </AdRow>
            ))}
          </div>
        ) : <Empty>You haven&apos;t posted any ads yet.</Empty>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Sidekick Wanted" subtitle="Hosts near you looking for help. Defaults to your service area." />
      <form
        className="card mb-4 grid gap-3 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(new URLSearchParams(Object.entries({ taskTypeId, zip, radius }).filter(([, v]) => v)).toString());
        }}
      >
        <select className="input sm:col-span-2" value={taskTypeId} onChange={(e) => setTaskTypeId(e.target.value)}>
          <option value="">All tasks</option>
          {catalog.data?.taskTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input className="input" placeholder="ZIP (default: your base)" value={zip} onChange={(e) => setZip(e.target.value)} />
        <div className="flex gap-2">
          <input className="input" type="number" placeholder="Miles" value={radius} onChange={(e) => setRadius(e.target.value)} />
          <button className="btn-primary">Go</button>
        </div>
      </form>
      {loading ? <Loading /> : data?.ads.length ? (
        <div className="space-y-3">{data.ads.map((ad) => <AdRow key={ad.id} ad={ad} />)}</div>
      ) : <Empty>No open ads in this area right now.</Empty>}
    </div>
  );
}
