"use client";

import Link from "next/link";
import { use, useState } from "react";
import { api, fmtDate, money } from "@/lib/client";
import { RequireRole, useAuth } from "@/components/AuthProvider";
import { ErrorNote, Loading, StatusBadge, useApi } from "@/components/ui";

export default function AdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole>
      <AdDetail id={id} />
    </RequireRole>
  );
}

function AdDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const { data, error } = useApi<{ ad: any }>(`/api/wanted-ads/${id}`);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<string | null>(null);
  if (error) return <ErrorNote error={error} />;
  if (!data) return <Loading />;
  const ad = data.ad;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/wanted" className="text-sm text-navy-700">← Wanted ads</Link>
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold text-navy-900">{ad.title}</h1>
          <StatusBadge status={ad.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">{ad.taskType.name}</span>
          {ad.recurring && <span className="chip">🔁 {ad.frequency?.toLowerCase()}</span>}
          {ad.budgetCents != null && <span className="chip">Budget {money(ad.budgetCents)}{ad.rateType === "HOURLY" ? "/hr" : ""}</span>}
          {ad.preferredDate && <span className="chip">Starting {fmtDate(ad.preferredDate)}</span>}
        </div>
        <p className="text-sm whitespace-pre-wrap">{ad.description}</p>
        <p className="text-xs text-gray-500">
          Posted by {ad.host.name.split(" ")[0]} · 📍 {ad.property ? `${ad.property.city}, ${ad.property.state}` : ad.zip} · {fmtDate(ad.createdAt)}
        </p>
      </div>
      {user!.role === "SIDEKICK" && ad.status === "OPEN" && (
        <div className="card space-y-2">
          <h2 className="font-bold text-navy-900">Interested?</h2>
          <ErrorNote error={err} />
          <textarea className="input" rows={4} placeholder="Introduce yourself, your availability and pricing…" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <button
            className="btn-accent"
            disabled={!msg.trim()}
            onClick={async () => {
              try {
                const { conversation } = await api(`/api/wanted-ads/${id}/respond`, { body: { message: msg } });
                window.location.href = `/messages/${conversation.id}`;
              } catch (e) {
                setErr((e as Error).message);
              }
            }}
          >
            Message the host
          </button>
        </div>
      )}
    </div>
  );
}
