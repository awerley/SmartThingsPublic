"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { api, fmtDate, fmtTime, money, rateLabel, toDateInput, toTimeInput } from "@/lib/client";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, Empty, ErrorNote, Field, Loading, Stars, useApi } from "@/components/ui";

export default function SidekickPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data, error } = useApi<{ sidekick: any; reviews: any[] }>(`/api/sidekicks/${id}`);
  const avail = useApi<{ windows: { start: string; end: string }[] }>(`/api/sidekicks/${id}/availability`);
  const [pick, setPick] = useState<Date | null>(null);

  if (error) return <ErrorNote error={error} />;
  if (!data) return <Loading />;
  const s = data.sidekick;

  const byDay = new Map<string, { start: string; end: string }[]>();
  for (const w of avail.data?.windows ?? []) {
    const k = toDateInput(new Date(w.start));
    byDay.set(k, [...(byDay.get(k) ?? []), w]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="card flex flex-wrap gap-5">
          <Avatar name={s.displayName} size={80} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-navy-900">{s.displayName}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Stars value={s.ratingAvg} count={s.ratingCount} />
              {s.providerType === "COMPANY" && <span className="chip">Company</span>}
              {s.insured && <span className="chip">✔ Insured</span>}
              {s.yearsExperience != null && <span className="chip">{s.yearsExperience} yrs experience</span>}
            </div>
            <p className="mt-3 text-sm whitespace-pre-wrap text-gray-700">{s.bio}</p>
            <p className="mt-2 text-xs text-gray-500">
              Serves {s.serviceRadiusMiles} mi around {s.baseZip ?? "their base"}
              {s.serviceZips.length > 0 && ` · ZIPs ${s.serviceZips.join(", ")}`}
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 font-bold text-navy-900">Services & rates</h2>
          <div className="divide-y">
            {s.tasks.map((t: any) => (
              <div key={t.id} className="flex justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{t.taskType}</div>
                  {t.notes && <div className="text-xs text-gray-500">{t.notes}</div>}
                </div>
                <div className="font-bold text-navy-700">{rateLabel(t.rateType, t.rateCents)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="label">Skills</h3>
              <div className="flex flex-wrap gap-1">{s.skills.map((k: any) => <span key={k.id} className="chip">{k.name}</span>)}</div>
            </div>
            <div>
              <h3 className="label">Tools & equipment</h3>
              <div className="flex flex-wrap gap-1">{s.tools.map((k: any) => <span key={k.id} className="chip">{k.name}</span>)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-1 font-bold text-navy-900">Availability — next 2 weeks</h2>
          <p className="mb-3 text-xs text-gray-500">Times shown in your timezone. Click a time to start a booking.</p>
          {avail.loading ? (
            <Loading />
          ) : byDay.size ? (
            <div className="space-y-2">
              {[...byDay.entries()].map(([day, ws]) => (
                <div key={day} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="w-28 font-medium">{fmtDate(ws[0].start)}</span>
                  {ws.map((w) => (
                    <button key={w.start} className="chip hover:bg-gold-300" onClick={() => setPick(new Date(w.start))}>
                      {fmtTime(w.start)} – {fmtTime(w.end)}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <Empty>No open time in the next two weeks. Send a message to ask about other times.</Empty>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-bold text-navy-900">Reviews</h2>
          {data.reviews.length ? (
            <div className="space-y-3">
              {data.reviews.map((r) => (
                <div key={r.id} className="text-sm">
                  <Stars value={r.rating} /> <span className="font-medium">{r.author}</span>{" "}
                  <span className="text-xs text-gray-500">· {r.taskType} · {fmtDate(r.createdAt)}</span>
                  {r.comment && <p className="text-gray-700">{r.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No reviews yet.</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {user?.role === "HOST" ? (
          <>
            <MessageBox sidekickId={s.id} name={s.displayName} />
            <BookingForm sidekick={s} pick={pick} windows={avail.data?.windows ?? []} />
          </>
        ) : (
          <div className="card text-sm">
            {user ? "Sign in with a Host account to book." : <><Link href="/login" className="font-semibold text-navy-700">Sign in</Link> as a Host to message or book this Sidekick.</>}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBox({ sidekickId, name }: { sidekickId: string; name: string }) {
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="card space-y-2">
      <h2 className="font-bold text-navy-900">Ask {name.split(" ")[0]} a question</h2>
      <ErrorNote error={err} />
      <textarea className="input" rows={3} placeholder="Hi! Can you handle a 3BR turnover on Saturdays?" value={msg} onChange={(e) => setMsg(e.target.value)} />
      <button
        className="btn-ghost w-full"
        disabled={!msg.trim()}
        onClick={async () => {
          try {
            const { conversation } = await api("/api/conversations", { body: { sidekickId, message: msg } });
            window.location.href = `/messages/${conversation.id}`;
          } catch (e) {
            setErr((e as Error).message);
          }
        }}
      >
        💬 Send message
      </button>
    </div>
  );
}

function BookingForm({ sidekick, pick, windows }: { sidekick: any; pick: Date | null; windows: { start: string; end: string }[] }) {
  const { user, paymentsEnabled } = useAuth();
  const props = useApi<{ properties: any[] }>("/api/properties");
  const catalog = useApi<{ fees: { oneTimeFeePercent: number; recurringFeePercent: number; minimumFeeCents: number } }>("/api/catalog");
  const [f, setF] = useState({
    propertyId: "",
    taskTypeId: sidekick.tasks[0]?.taskTypeId ?? "",
    title: "",
    description: "",
    date: "",
    time: "10:00",
    hours: "2",
    estimatedHours: "",
    repeat: "",
    endsOn: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill the date/time when a slot is picked from the availability list.
  const pickKey = pick?.getTime();
  useEffect(() => {
    if (pick) setF((x) => ({ ...x, date: toDateInput(pick), time: toTimeInput(pick) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickKey]);

  const task = sidekick.tasks.find((t: any) => t.taskTypeId === f.taskTypeId);
  const propertyId = f.propertyId || props.data?.properties[0]?.id || "";
  const fees = catalog.data?.fees;
  const durationHours = Number(f.hours) || 0;
  const start = f.date ? new Date(`${f.date}T${f.time}`) : null;
  const end = start ? new Date(start.getTime() + durationHours * 3_600_000) : null;
  const fits = start && end && windows.some((w) => new Date(w.start) <= start && new Date(w.end) >= end);

  let estimate: { sub: number; fee: number } | null = null;
  if (task && fees) {
    const billHours = Number(f.estimatedHours) || durationHours;
    const sub = task.rateType === "FLAT" ? task.rateCents : Math.round(task.rateCents * billHours);
    const pct = f.repeat ? fees.recurringFeePercent : fees.oneTimeFeePercent;
    estimate = { sub, fee: sub ? Math.max(fees.minimumFeeCents, Math.round((sub * pct) / 100)) : 0 };
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  if (props.data && props.data.properties.length === 0) {
    return (
      <div className="card text-sm">
        <Link href="/properties" className="font-semibold text-navy-700">Add a property</Link> before booking.
      </div>
    );
  }
  if (paymentsEnabled && !user?.hasPaymentMethod) {
    return (
      <div className="card text-sm">
        <Link href="/account/payments" className="font-semibold text-navy-700">Add a payment method</Link> to book Sidekicks.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!start) return;
    setBusy(true);
    setErr(null);
    try {
      const { job } = await api("/api/jobs", {
        body: {
          sidekickId: sidekick.id,
          propertyId,
          taskTypeId: f.taskTypeId,
          title: f.title || task?.taskType,
          description: f.description || undefined,
          startAt: start.toISOString(),
          durationMinutes: Math.round(durationHours * 60),
          estimatedHours: f.estimatedHours ? Number(f.estimatedHours) : undefined,
          recurrence: f.repeat ? { frequency: f.repeat, endsOn: f.endsOn ? new Date(`${f.endsOn}T23:59`).toISOString() : null } : null,
        },
      });
      window.location.href = `/jobs/${job.id}`;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-bold text-navy-900">Request a job</h2>
      <ErrorNote error={err} />
      <Field label="Property">
        <select className="input" value={propertyId} onChange={set("propertyId")}>
          {props.data?.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Task">
        <select className="input" value={f.taskTypeId} onChange={set("taskTypeId")}>
          {sidekick.tasks.map((t: any) => <option key={t.taskTypeId} value={t.taskTypeId}>{t.taskType} — {rateLabel(t.rateType, t.rateCents)}</option>)}
        </select>
      </Field>
      <Field label="Title">
        <input className="input" placeholder={task?.taskType} value={f.title} onChange={set("title")} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Date"><input className="input" type="date" required value={f.date} onChange={set("date")} /></Field>
        <Field label="Start"><input className="input" type="time" required value={f.time} onChange={set("time")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Time window (hrs)"><input className="input" type="number" step="0.25" min="0.25" value={f.hours} onChange={set("hours")} /></Field>
        {task?.rateType === "HOURLY" && (
          <Field label="Est. hours billed"><input className="input" type="number" step="0.25" min="0.25" placeholder={f.hours} value={f.estimatedHours} onChange={set("estimatedHours")} /></Field>
        )}
      </div>
      {start && !fits && <p className="text-xs text-flame-600">That time is outside this Sidekick&apos;s open availability.</p>}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Repeat">
          <select className="input" value={f.repeat} onChange={set("repeat")}>
            <option value="">One time</option>
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Every 2 weeks</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </Field>
        {f.repeat && <Field label="Ends on (optional)"><input className="input" type="date" value={f.endsOn} onChange={set("endsOn")} /></Field>}
      </div>
      <Field label="Details">
        <textarea className="input" rows={3} placeholder="Access instructions, special requests…" value={f.description} onChange={set("description")} />
      </Field>
      {estimate && (
        <div className="rounded-xl bg-navy-50 p-3 text-sm">
          <div className="flex justify-between"><span>Service</span><span>{money(estimate.sub)}</span></div>
          <div className="flex justify-between"><span>Marketplace fee</span><span>{money(estimate.fee)}</span></div>
          <div className="flex justify-between font-bold"><span>Estimated total{f.repeat ? " / visit" : ""}</span><span>{money(estimate.sub + estimate.fee)}</span></div>
          <p className="mt-1 text-xs text-gray-500">Your card is charged when the job is marked complete.</p>
        </div>
      )}
      <button className="btn-accent w-full" disabled={busy || !start}>
        {busy ? "Sending…" : f.repeat ? "Request recurring job" : "Request job"}
      </button>
    </form>
  );
}
