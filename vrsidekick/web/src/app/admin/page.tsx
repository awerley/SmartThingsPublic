"use client";

import Link from "next/link";
import { money } from "@/lib/client";
import { RequireRole } from "@/components/AuthProvider";
import { Loading, PageHeader, useApi } from "@/components/ui";

export default function AdminHome() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <Stats />
    </RequireRole>
  );
}

function Stats() {
  const { data } = useApi<any>("/api/admin/stats");
  if (!data) return <Loading />;
  const tiles = [
    ["Hosts", data.hosts, "/admin/users"],
    ["Sidekicks", data.sidekicks, "/admin/users"],
    ["Pending requests", data.openRequests, "/admin/jobs"],
    ["Upcoming jobs", data.upcoming, "/admin/jobs"],
    ["Completed jobs", data.completed, "/admin/jobs"],
    ["Active recurring", data.activeSeries, "/admin/jobs"],
    ["Open wanted ads", data.openAds, "/admin/ads"],
    ["Gross volume", money(data.grossVolumeCents), "/admin/jobs"],
    ["Fee revenue", money(data.feeRevenueCents), "/admin/settings"],
  ];
  return (
    <div>
      <PageHeader title="Admin overview" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {tiles.map(([label, value, href]) => (
          <Link key={label} href={href} className="card hover:border-gold-400">
            <div className="text-xs font-semibold text-gray-500 uppercase">{label}</div>
            <div className="mt-1 text-3xl font-black text-navy-900">{value}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
