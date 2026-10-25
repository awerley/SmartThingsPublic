"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { RequireRole, useAuth } from "@/components/AuthProvider";
import { ErrorNote, Field, Loading, PageHeader, useApi } from "@/components/ui";

export default function Payments() {
  return (
    <RequireRole>
      <PaymentsInner />
    </RequireRole>
  );
}

function PaymentsInner() {
  const { user, refresh } = useAuth();
  const { data } = useApi<any>("/api/payments");
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [account, setAccount] = useState({ name: user!.name, phone: user!.phone ?? "" });

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("card") === "saved") setNotice("Card saved. You're ready to book!");
    if (sp.get("card") === "failed") setErr("We couldn't save that card. Please try again.");
    if (sp.get("payouts")) setNotice("Payout details updated.");
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function go(path: string) {
    setErr(null);
    try {
      const { url } = await api(path, { method: "POST" });
      window.location.href = url;
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!data) return <Loading />;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Account & payments" />
      {notice && <div className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</div>}
      <ErrorNote error={err} />

      <form
        className="card grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await api("/api/auth/me", { method: "PATCH", body: { name: account.name, phone: account.phone || null } }).catch((e) => setErr(e.message));
          setNotice("Account updated.");
          refresh();
        }}
      >
        <Field label="Name"><input className="input" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} /></Field>
        <div className="text-sm text-gray-500 sm:col-span-2">Signed in as {user!.email}</div>
        <button className="btn-ghost w-fit">Save</button>
      </form>

      {!data.paymentsEnabled && (
        <div className="rounded-xl bg-gold-300/30 p-4 text-sm">
          Stripe isn&apos;t configured on this server (development mode). Jobs are marked paid automatically when completed.
        </div>
      )}

      {user!.role === "HOST" && (
        <div className="card space-y-2">
          <h2 className="font-bold text-navy-900">Payment method</h2>
          <p className="text-sm text-gray-600">
            Your card is charged automatically when a Sidekick marks a job complete. The total includes the Sidekick&apos;s price plus a
            marketplace service fee.
          </p>
          <p className="text-sm">{data.hasPaymentMethod ? "✅ Card on file" : "No card on file yet."}</p>
          {data.paymentsEnabled && (
            <button className="btn-primary" onClick={() => go("/api/payments/setup")}>{data.hasPaymentMethod ? "Replace card" : "Add a card"}</button>
          )}
        </div>
      )}

      {user!.role === "SIDEKICK" && (
        <div className="card space-y-2">
          <h2 className="font-bold text-navy-900">Payouts</h2>
          <p className="text-sm text-gray-600">
            We use Stripe to send your earnings straight to your bank account after each completed job. You receive your full listed
            rate — the marketplace fee is paid by the host.
          </p>
          <p className="text-sm">{data.payoutsEnabled ? "✅ Payouts enabled" : data.payoutAccountStarted ? "⏳ Setup incomplete" : "Not set up yet."}</p>
          {data.paymentsEnabled && (
            <button className="btn-primary" onClick={() => go("/api/payments/connect")}>{data.payoutsEnabled ? "Update payout details" : "Set up payouts"}</button>
          )}
        </div>
      )}
    </div>
  );
}
