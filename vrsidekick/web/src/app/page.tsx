"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useApi } from "@/components/ui";

export default function Home() {
  const { user } = useAuth();
  const { data } = useApi<{ taskTypes: { id: string; name: string; icon: string | null }[] }>("/api/catalog");
  useEffect(() => {
    if (user) window.location.href = user.role === "ADMIN" ? "/admin" : "/dashboard";
  }, [user]);

  return (
    <div className="-mx-4 -my-6">
      <section className="bg-gradient-to-b from-navy-900 to-navy-700 px-4 pt-10 pb-16 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2">
          <div>
            <h1 className="text-4xl leading-tight font-black md:text-5xl">
              Your vacation rental&apos;s <span className="text-gold-400">trusted Sidekick</span>.
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Book local pros for turnovers, laundry, lawn and pool care, repairs and guest check-ins — one time or on a
              recurring schedule.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register?role=HOST" className="btn-accent px-6 py-3 text-base">
                I&apos;m a Host
              </Link>
              <Link href="/register?role=SIDEKICK" className="btn border border-white/40 px-6 py-3 text-base text-white hover:bg-white/10">
                Become a Sidekick
              </Link>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="VR Sidekick" className="mx-auto w-72 md:w-96" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-extrabold text-navy-900">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["1. Search", "Filter Sidekicks by your rental's ZIP code, the task, and the skills or tools you need."],
            ["2. Chat & book", "Message to confirm details, then request a time from their live availability."],
            ["3. Relax", "Your Sidekick shows up, marks the job complete and your card is charged automatically."],
          ].map(([t, d]) => (
            <div key={t} className="card">
              <h3 className="font-bold text-navy-700">{t}</h3>
              <p className="mt-1 text-sm text-gray-600">{d}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-extrabold text-navy-900">Popular tasks</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {data?.taskTypes.map((t) => (
            <Link key={t.id} href={`/search?taskTypeId=${t.id}`} className="card flex flex-col items-center p-4 text-center hover:border-gold-400">
              <span className="text-2xl">{t.icon ?? "🛠️"}</span>
              <span className="mt-2 text-xs font-semibold">{t.name}</span>
            </Link>
          ))}
        </div>

        <div className="card mt-12 flex flex-wrap items-center justify-between gap-4 bg-navy-50">
          <div>
            <h3 className="text-lg font-bold text-navy-900">Can&apos;t find the right fit?</h3>
            <p className="text-sm text-gray-600">Post a &ldquo;Sidekick Wanted&rdquo; ad and let local pros come to you.</p>
          </div>
          <Link href="/register?role=HOST" className="btn-primary">
            Post an ad
          </Link>
        </div>
      </section>
    </div>
  );
}
