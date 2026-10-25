"use client";

import Link from "next/link";
import { useState } from "react";
import { api, fmtDate, money } from "@/lib/client";
import { RequireRole, useAuth } from "@/components/AuthProvider";
import { JobCard, type JobLite } from "@/components/JobCard";
import { Empty, ErrorNote, Loading, PageHeader, StatusBadge, useApi } from "@/components/ui";

export default function Dashboard() {
  return (
    <RequireRole roles={["HOST", "SIDEKICK"]}>
      <DashboardInner />
    </RequireRole>
  );
}

function DashboardInner() {
  const { user, sidekick, paymentsEnabled } = useAuth();
  const isSidekick = user!.role === "SIDEKICK";
  const jobs = useApi<{ jobs: JobLite[] }>(`/api/jobs?status=REQUESTED,ACCEPTED&from=${new Date().toISOString().slice(0, 10)}`);
  const series = useApi<{ series: any[] }>("/api/series");
  const [error, setError] = useState<string | null>(null);

  const requested = jobs.data?.jobs.filter((j) => j.status === "REQUESTED") ?? [];
  const upcoming = jobs.data?.jobs.filter((j) => j.status === "ACCEPTED").slice(0, 8) ?? [];
  const activeSeries = series.data?.series.filter((s) => s.status === "ACTIVE" || s.status === "REQUESTED") ?? [];

  async function act(id: string, action: "accept" | "decline") {
    setError(null);
    try {
      await api(`/api/jobs/${id}`, { method: "PATCH", body: { action } });
      jobs.reload();
      series.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hi, ${user!.name.split(" ")[0]} 👋`}
        subtitle={isSidekick ? "Here's what's on your plate." : "Here's what's happening at your rentals."}
        actions={
          isSidekick ? (
            <>
              <Link href="/wanted" className="btn-accent">Browse wanted ads</Link>
              <Link href="/availability" className="btn-ghost">Update availability</Link>
            </>
          ) : (
            <>
              <Link href="/search" className="btn-accent">Find a Sidekick</Link>
              <Link href="/wanted/new" className="btn-ghost">Post a wanted ad</Link>
            </>
          )
        }
      />

      {paymentsEnabled && !isSidekick && !user!.hasPaymentMethod && (
        <Banner href="/account/payments" text="Add a payment method so you can book Sidekicks." cta="Add card" />
      )}
      {paymentsEnabled && isSidekick && !sidekick?.payoutsEnabled && (
        <Banner href="/account/payments" text="Set up payouts so you can accept jobs and get paid." cta="Set up payouts" />
      )}
      <ErrorNote error={error} />

      <section>
        <h2 className="mb-3 text-lg font-bold text-navy-900">
          {isSidekick ? "Requests awaiting your response" : "Pending requests"} ({requested.length})
        </h2>
        {jobs.loading ? (
          <Loading />
        ) : requested.length ? (
          <div className="space-y-3">
            {requested.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                viewer={user!.role}
                actions={
                  isSidekick && (
                    <div className="flex gap-2">
                      <button className="btn-primary" onClick={() => act(j.id, "accept")}>Accept</button>
                      <button className="btn-ghost" onClick={() => act(j.id, "decline")}>Decline</button>
                    </div>
                  )
                }
              />
            ))}
          </div>
        ) : (
          <Empty>No pending requests.</Empty>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900">Upcoming jobs</h2>
          <Link href="/calendar" className="text-sm font-semibold text-navy-700">Open calendar →</Link>
        </div>
        {upcoming.length ? (
          <div className="space-y-3">
            {upcoming.map((j) => <JobCard key={j.id} job={j} viewer={user!.role} />)}
          </div>
        ) : (
          <Empty>Nothing scheduled yet.</Empty>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-navy-900">Recurring schedules</h2>
        {activeSeries.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {activeSeries.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{s.title}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  🔁 {s.frequency.toLowerCase()} · {s.taskType.name} · {s.property.name}
                </div>
                <div className="text-xs text-gray-500">
                  {isSidekick ? `Host: ${s.host.name}` : `Sidekick: ${s.sidekick.displayName}`} · {money(s.rateCents)}
                  {s.rateType === "HOURLY" ? "/hr" : ""}
                  {s.jobs[0] && ` · next ${fmtDate(s.jobs[0].startAt)}`}
                </div>
                <button
                  className="mt-3 text-xs font-semibold text-flame-600"
                  onClick={async () => {
                    if (!confirm("Stop this recurring schedule and cancel future visits?")) return;
                    await api(`/api/series/${s.id}`, { method: "PATCH", body: { action: "cancel" } }).catch((e) => setError(e.message));
                    series.reload();
                    jobs.reload();
                  }}
                >
                  Stop schedule
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No recurring schedules. {isSidekick ? "" : "Choose “Repeat” when booking to set one up."}</Empty>
        )}
      </section>
    </div>
  );
}

function Banner({ href, text, cta }: { href: string; text: string; cta: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-400 bg-gold-300/30 px-4 py-3">
      <span className="text-sm font-medium text-navy-900">{text}</span>
      <Link href={href} className="btn-primary">{cta}</Link>
    </div>
  );
}
