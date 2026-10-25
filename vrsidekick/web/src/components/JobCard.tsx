"use client";

import Link from "next/link";
import { fmtDateTime, fmtTime, money } from "@/lib/client";
import { StatusBadge } from "./ui";

export type JobLite = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  paymentStatus: string;
  totalCents: number;
  seriesId: string | null;
  series?: { frequency: string } | null;
  taskType: { name: string };
  property: { name: string; city: string };
  host: { name: string };
  sidekick: { displayName: string };
};

export function JobCard({ job, viewer, actions }: { job: JobLite; viewer: "HOST" | "SIDEKICK" | "ADMIN"; actions?: React.ReactNode }) {
  return (
    <div className="card flex flex-wrap items-center gap-4 p-4">
      <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-navy-900">{job.title}</span>
          <StatusBadge status={job.status} />
          {job.seriesId && <span className="chip">🔁 {job.series?.frequency.toLowerCase() ?? "recurring"}</span>}
        </div>
        <div className="mt-1 text-sm text-gray-600">
          {fmtDateTime(job.startAt)}–{fmtTime(job.endAt)} · {job.taskType.name} · {job.property.name}, {job.property.city}
        </div>
        <div className="text-xs text-gray-500">
          {viewer === "SIDEKICK" ? `Host: ${job.host.name}` : `Sidekick: ${job.sidekick.displayName}`} · {money(job.totalCents)}
          {job.status === "COMPLETED" && ` · payment ${job.paymentStatus.toLowerCase()}`}
        </div>
      </Link>
      {actions}
    </div>
  );
}
