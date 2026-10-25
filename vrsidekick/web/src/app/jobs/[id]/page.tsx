"use client";

import Link from "next/link";
import { use, useState } from "react";
import { api, fmtDateTime, fmtTime, money, rateLabel } from "@/lib/client";
import { RequireRole, useAuth } from "@/components/AuthProvider";
import { ErrorNote, Field, Loading, StatusBadge, Stars, useApi } from "@/components/ui";

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole>
      <JobDetail id={id} />
    </RequireRole>
  );
}

function JobDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const { data, error, reload } = useApi<{ job: any }>(`/api/jobs/${id}`);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hours, setHours] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  if (error) return <ErrorNote error={error} />;
  if (!data) return <Loading />;
  const job = data.job;
  const isHost = job.hostId === user!.id;
  const isSidekick = job.sidekick.userId === user!.id;
  const started = new Date(job.startAt) <= new Date();

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/jobs/${id}`, { method: "PATCH", body });
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startChat() {
    const { conversations } = await api("/api/conversations");
    const c = conversations.find((c: any) => c.sidekickId === job.sidekickId && c.hostId === job.hostId);
    window.location.href = c ? `/messages/${c.id}` : "/messages";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/jobs" className="text-sm text-navy-700">← All jobs</Link>
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold text-navy-900">{job.title}</h1>
          <StatusBadge status={job.status} />
          {job.series && <span className="chip">🔁 Repeats {job.series.frequency.toLowerCase()}</span>}
        </div>
        <ErrorNote error={err} />
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Info label="When">{fmtDateTime(job.startAt)} – {fmtTime(job.endAt)}</Info>
          <Info label="Task">{job.taskType.name}</Info>
          <Info label="Property">
            {job.property.name}
            <div className="text-gray-500">{job.property.address}, {job.property.city}, {job.property.state} {job.property.zip}</div>
          </Info>
          <Info label={isSidekick ? "Host" : "Sidekick"}>
            {isSidekick ? (
              <>{job.host.name}{job.host.phone && <div className="text-gray-500">{job.host.phone}</div>}</>
            ) : (
              <Link href={`/sidekicks/${job.sidekickId}`} className="text-navy-700 underline">{job.sidekick.displayName}</Link>
            )}
          </Info>
          <Info label="Rate">
            {rateLabel(job.rateType, job.rateCents)}
            {job.rateType === "HOURLY" && (
              <div className="text-gray-500">
                {job.actualHours != null ? `${job.actualHours} hrs worked` : job.estimatedHours ? `~${job.estimatedHours} hrs est.` : "billed by scheduled time"}
              </div>
            )}
          </Info>
          <Info label={job.status === "COMPLETED" ? "Charged" : "Estimated total"}>
            <div>{money(job.subtotalCents)} service</div>
            {!isSidekick && <div>{money(job.serviceFeeCents)} marketplace fee ({job.feePercentApplied}%)</div>}
            <div className="font-bold">{money(isSidekick ? job.subtotalCents : job.totalCents)} {isSidekick ? "to you" : "total"}</div>
            {job.status === "COMPLETED" && <div className="text-gray-500">Payment: {job.paymentStatus.toLowerCase()}</div>}
          </Info>
        </dl>
        {job.description && <p className="rounded-xl bg-gray-50 p-3 text-sm whitespace-pre-wrap">{job.description}</p>}
        {job.property.notes && isSidekick && (
          <p className="rounded-xl bg-gold-300/20 p-3 text-sm whitespace-pre-wrap"><b>Property notes:</b> {job.property.notes}</p>
        )}

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <button className="btn-ghost" onClick={startChat}>💬 Message</button>
          {isSidekick && job.status === "REQUESTED" && (
            <>
              <button className="btn-primary" disabled={busy} onClick={() => act({ action: "accept" })}>
                Accept{job.series ? " recurring job" : ""}
              </button>
              <button className="btn-ghost" disabled={busy} onClick={() => act({ action: "decline" })}>Decline</button>
            </>
          )}
          {["REQUESTED", "ACCEPTED"].includes(job.status) && (
            <button className="btn-ghost text-flame-600" disabled={busy} onClick={() => confirm("Cancel this visit?") && act({ action: "cancel" })}>
              Cancel visit
            </button>
          )}
          {job.series && ["REQUESTED", "ACCEPTED"].includes(job.status) && (
            <button className="btn-ghost text-flame-600" disabled={busy} onClick={() => confirm("Cancel all future visits in this schedule?") && act({ action: "cancel", wholeSeries: true })}>
              Stop recurring schedule
            </button>
          )}
        </div>

        {isSidekick && job.status === "ACCEPTED" && started && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl bg-navy-50 p-4">
            {job.rateType === "HOURLY" && (
              <Field label="Hours worked">
                <input className="input w-32" type="number" step="0.25" min="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
              </Field>
            )}
            <button
              className="btn-accent"
              disabled={busy}
              onClick={() => act({ action: "complete", actualHours: hours ? Number(hours) : undefined })}
            >
              Mark complete & request payment
            </button>
          </div>
        )}

        {isHost && job.status === "COMPLETED" && !job.review && (
          <div className="space-y-3 rounded-xl bg-navy-50 p-4">
            <h3 className="font-bold">Rate your Sidekick</h3>
            <div className="flex gap-1 text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className={n <= rating ? "text-gold-500" : "text-gray-300"}>★</button>
              ))}
            </div>
            <textarea className="input" rows={3} placeholder="How did it go?" value={comment} onChange={(e) => setComment(e.target.value)} />
            <button
              className="btn-primary"
              onClick={async () => {
                try {
                  await api(`/api/jobs/${id}/review`, { body: { rating, comment: comment || undefined } });
                  reload();
                } catch (e) {
                  setErr((e as Error).message);
                }
              }}
            >
              Submit review
            </button>
          </div>
        )}
        {job.review && (
          <div className="rounded-xl bg-gray-50 p-3 text-sm">
            <Stars value={job.review.rating} /> {job.review.comment}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
