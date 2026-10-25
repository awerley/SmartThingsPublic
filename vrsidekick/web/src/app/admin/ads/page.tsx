"use client";

import { api, fmtDate } from "@/lib/client";
import { RequireRole } from "@/components/AuthProvider";
import { Empty, Loading, PageHeader, StatusBadge, useApi } from "@/components/ui";

export default function AdminAds() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <Ads />
    </RequireRole>
  );
}

function Ads() {
  const { data, loading, reload } = useApi<{ ads: any[] }>("/api/admin/wanted-ads");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Wanted ads" subtitle="Moderate host ads." />
      {loading ? <Loading /> : data?.ads.length ? (
        <div className="card divide-y p-0">
          {data.ads.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">{a.title} <StatusBadge status={a.status} /></div>
                <div className="text-xs text-gray-500">{a.taskType.name} · {a.zip} · {a.host.name} ({a.host.email}) · {fmtDate(a.createdAt)}</div>
              </div>
              {a.status === "OPEN" && (
                <button className="text-xs font-semibold text-navy-700" onClick={async () => { await api(`/api/wanted-ads/${a.id}`, { method: "PATCH", body: { status: "CLOSED" } }); reload(); }}>Close</button>
              )}
              <button className="text-xs text-flame-600" onClick={async () => { if (confirm("Delete ad?")) { await api(`/api/wanted-ads/${a.id}`, { method: "DELETE" }); reload(); } }}>Delete</button>
            </div>
          ))}
        </div>
      ) : <Empty>No ads.</Empty>}
    </div>
  );
}
