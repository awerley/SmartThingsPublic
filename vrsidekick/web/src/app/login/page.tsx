"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorNote, Field } from "@/components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api("/api/auth/login", { body: { email, password } });
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next ?? (user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-8 max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold text-navy-900">Welcome back</h1>
      <ErrorNote error={error} />
      <Field label="Email">
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password">
        <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-gray-600">
        New here? <Link href="/register" className="font-semibold text-navy-700">Create an account</Link>
      </p>
    </form>
  );
}
