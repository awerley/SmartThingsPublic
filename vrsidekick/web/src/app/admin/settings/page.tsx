"use client";

import { useEffect, useState } from "react";
import { api, money } from "@/lib/client";
import { RequireRole } from "@/components/AuthProvider";
import { ErrorNote, Field, Loading, PageHeader, useApi } from "@/components/ui";

export default function AdminSettings() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <Settings />
    </RequireRole>
  );
}

function Settings() {
  const { data } = useApi<{ settings: any }>("/api/admin/settings");
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (data) setS({ ...data.settings, minimumFee: data.settings.minimumFeeCents / 100 });
  }, [data]);
  if (!s) return <Loading />;

  const example = (pct: number) => {
    const fee = Math.max(Math.round(s.minimumFee * 100), Math.round(10000 * pct / 100));
    return `On a $100 job the host pays ${money(10000 + fee)} (${money(fee)} fee).`;
  };

  return (
    <form
      className="mx-auto max-w-2xl"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        try {
          await api("/api/admin/settings", {
            method: "PUT",
            body: {
              oneTimeFeePercent: Number(s.oneTimeFeePercent),
              recurringFeePercent: Number(s.recurringFeePercent),
              minimumFeeCents: Math.round(Number(s.minimumFee) * 100),
              recurringHorizonDays: Number(s.recurringHorizonDays),
            },
          });
          setMsg("Settings saved. New fees apply to jobs requested from now on.");
        } catch (e) {
          setErr((e as Error).message);
        }
      }}
    >
      <PageHeader title="Fees & settings" subtitle="The service fee is charged to the host on top of the Sidekick's price." />
      {msg && <div className="mb-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</div>}
      <ErrorNote error={err} />
      <div className="card space-y-4">
        <Field label="One-time job service fee (%)" hint={example(Number(s.oneTimeFeePercent))}>
          <input className="input w-40" type="number" step="0.1" min="0" max="50" value={s.oneTimeFeePercent} onChange={(e) => setS({ ...s, oneTimeFeePercent: e.target.value })} />
        </Field>
        <Field label="Recurring job service fee (%)" hint={example(Number(s.recurringFeePercent))}>
          <input className="input w-40" type="number" step="0.1" min="0" max="50" value={s.recurringFeePercent} onChange={(e) => setS({ ...s, recurringFeePercent: e.target.value })} />
        </Field>
        <Field label="Minimum fee per job ($)">
          <input className="input w-40" type="number" step="0.01" min="0" value={s.minimumFee} onChange={(e) => setS({ ...s, minimumFee: e.target.value })} />
        </Field>
        <Field label="Recurring scheduling horizon (days)" hint="How far ahead recurring visits are placed on calendars.">
          <input className="input w-40" type="number" min="7" max="180" value={s.recurringHorizonDays} onChange={(e) => setS({ ...s, recurringHorizonDays: e.target.value })} />
        </Field>
        <button className="btn-primary">Save settings</button>
      </div>
    </form>
  );
}
