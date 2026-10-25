"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fmtTime, toDateInput } from "@/lib/client";
import { RequireRole, useAuth } from "@/components/AuthProvider";
import { PageHeader, StatusBadge, useApi } from "@/components/ui";

type Event = { id: string; title: string; start: string; end: string; status: string; recurring: boolean; subtitle: string };
type Feed = { events: Event[]; availability?: { start: string; end: string }[]; exceptions?: { id: string; kind: string; startAt: string; endAt: string; reason: string | null }[] };

export default function CalendarPage() {
  return (
    <RequireRole roles={["HOST", "SIDEKICK"]}>
      <CalendarInner />
    </RequireRole>
  );
}

function CalendarInner() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(toDateInput(new Date()));
  const gridStart = useMemo(() => {
    const d = new Date(month);
    d.setDate(1 - ((d.getDay() + 6) % 7)); // back to Monday
    return d;
  }, [month]);
  const gridEnd = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + 42);
  const { data } = useApi<Feed>(`/api/calendar?from=${gridStart.toISOString()}&to=${gridEnd.toISOString()}`);

  const group = <T,>(items: T[], key: (x: T) => string) => {
    const m = new Map<string, T[]>();
    for (const it of items) m.set(key(it), [...(m.get(key(it)) ?? []), it]);
    return m;
  };
  const events = group(data?.events ?? [], (e) => toDateInput(new Date(e.start)));
  const avail = group(data?.availability ?? [], (a) => toDateInput(new Date(a.start)));
  const blocks = group((data?.exceptions ?? []).filter((x) => x.kind === "BLOCK"), (a) => toDateInput(new Date(a.startAt)));

  const days = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  const today = toDateInput(new Date());
  const isSidekick = user!.role === "SIDEKICK";

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle={isSidekick ? "Your scheduled jobs and open availability." : "Scheduled work across your properties."}
        actions={
          <>
            <button className="btn-ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button>
            <span className="self-center px-2 font-bold text-navy-900">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
            <button className="btn-ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button>
            {isSidekick && <Link href="/availability" className="btn-primary">Edit availability</Link>}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card overflow-hidden p-0 lg:col-span-2">
          <div className="grid grid-cols-7 border-b bg-navy-50 text-center text-xs font-semibold text-navy-700">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const k = toDateInput(d);
              const evs = events.get(k) ?? [];
              const inMonth = d.getMonth() === month.getMonth();
              return (
                <button
                  key={k}
                  onClick={() => setSelected(k)}
                  className={`min-h-24 border-r border-b p-1 text-left align-top ${inMonth ? "" : "bg-gray-50 text-gray-400"} ${selected === k ? "ring-2 ring-gold-400 ring-inset" : ""}`}
                >
                  <div className={`mb-1 text-xs font-semibold ${k === today ? "inline-block rounded-full bg-flame-500 px-1.5 text-white" : ""}`}>{d.getDate()}</div>
                  {isSidekick && avail.has(k) && <div className="mb-0.5 h-1 rounded bg-green-400" title="Open availability" />}
                  {isSidekick && blocks.has(k) && <div className="mb-0.5 h-1 rounded bg-gray-400" title="Blocked time" />}
                  {evs.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className={`mb-0.5 truncate rounded px-1 text-[10px] font-medium ${e.status === "REQUESTED" ? "bg-amber-100 text-amber-900" : e.status === "COMPLETED" ? "bg-gray-200 text-gray-700" : "bg-navy-700 text-white"}`}
                    >
                      {fmtTime(e.start)} {e.title}
                    </div>
                  ))}
                  {evs.length > 3 && <div className="text-[10px] text-gray-500">+{evs.length - 3} more</div>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="font-bold text-navy-900">
            {new Date(`${selected}T12:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </h2>
          {(events.get(selected) ?? []).map((e) => (
            <Link key={e.id} href={`/jobs/${e.id}`} className="card block p-3 hover:border-gold-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{e.title}</span>
                <StatusBadge status={e.status} />
                {e.recurring && <span>🔁</span>}
              </div>
              <div className="text-sm text-gray-600">{fmtTime(e.start)} – {fmtTime(e.end)}</div>
              <div className="text-xs text-gray-500">{e.subtitle}</div>
            </Link>
          ))}
          {isSidekick &&
            (avail.get(selected) ?? []).map((a) => (
              <div key={a.start} className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-900">
                Open {fmtTime(a.start)} – {fmtTime(a.end)}
              </div>
            ))}
          {isSidekick &&
            (blocks.get(selected) ?? []).map((b) => (
              <div key={b.id} className="rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-700">
                Blocked {fmtTime(b.startAt)} – {fmtTime(b.endAt)} {b.reason && `· ${b.reason}`}
              </div>
            ))}
          {!(events.get(selected)?.length || avail.get(selected)?.length || blocks.get(selected)?.length) && (
            <p className="text-sm text-gray-500">Nothing on this day.</p>
          )}
        </div>
      </div>
    </div>
  );
}
