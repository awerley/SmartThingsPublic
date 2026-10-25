"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ErrorNote, Field } from "@/components/ui";

export default function Register() {
  const [role, setRole] = useState<"HOST" | "SIDEKICK">("HOST");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", zip: "", companyName: "" });
  const [providerType, setProviderType] = useState<"INDIVIDUAL" | "COMPANY">("INDIVIDUAL");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("role");
    if (r === "SIDEKICK" || r === "HOST") setRole(r);
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/register", {
        body: {
          role,
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          ...(role === "SIDEKICK"
            ? {
                providerType,
                companyName: providerType === "COMPANY" ? form.companyName : undefined,
                zip: form.zip || undefined,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }
            : {}),
        },
      });
      window.location.href = role === "SIDEKICK" ? "/profile?welcome=1" : "/properties?welcome=1";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-8 max-w-lg space-y-4">
      <h1 className="text-2xl font-extrabold text-navy-900">Create your account</h1>
      <div className="grid grid-cols-2 gap-2">
        {(["HOST", "SIDEKICK"] as const).map((r) => (
          <button
            type="button"
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-xl border-2 p-3 text-left ${role === r ? "border-navy-700 bg-navy-50" : "border-gray-200"}`}
          >
            <div className="font-bold text-navy-900">{r === "HOST" ? "🏠 Host" : "⚡ Sidekick"}</div>
            <div className="text-xs text-gray-600">{r === "HOST" ? "I operate a vacation rental" : "I provide services to rentals"}</div>
          </button>
        ))}
      </div>
      <ErrorNote error={error} />
      {role === "SIDEKICK" && (
        <div className="flex gap-4 text-sm">
          {(["INDIVIDUAL", "COMPANY"] as const).map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input type="radio" checked={providerType === t} onChange={() => setProviderType(t)} />
              {t === "INDIVIDUAL" ? "Individual" : "Company"}
            </label>
          ))}
        </div>
      )}
      {role === "SIDEKICK" && providerType === "COMPANY" && (
        <Field label="Company name">
          <input className="input" required value={form.companyName} onChange={set("companyName")} />
        </Field>
      )}
      <Field label={role === "SIDEKICK" && providerType === "COMPANY" ? "Contact name" : "Full name"}>
        <input className="input" required value={form.name} onChange={set("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email">
          <input className="input" type="email" required value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Phone">
          <input className="input" type="tel" value={form.phone} onChange={set("phone")} />
        </Field>
      </div>
      <Field label="Password" hint="At least 8 characters">
        <input className="input" type="password" required minLength={8} value={form.password} onChange={set("password")} />
      </Field>
      {role === "SIDEKICK" && (
        <Field label="Home base ZIP" hint="Used to match you with nearby rentals. You can refine your service area later.">
          <input className="input" required pattern="\d{5}" value={form.zip} onChange={set("zip")} />
        </Field>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-gray-600">
        Already have an account? <Link href="/login" className="font-semibold text-navy-700">Sign in</Link>
      </p>
    </form>
  );
}
