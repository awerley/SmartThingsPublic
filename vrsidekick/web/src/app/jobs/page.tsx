"use client";

import { useState } from "react";
import { RequireRole, useAuth } from "@/components/AuthProvider";
import { JobCard, type JobLite } from "@/components/JobCard";
import { Empty, Loading, PageHeader, useApi } from "@/components/ui";

const TABS = [
  ["Upcoming", "REQUESTED,ACCEPTED"],
  ["Completed", "COMPLETED"],
  ["Cancelled / declined", "CANCELLED,DECLINED"],
] as const;

export default function Jobs() {
  return (
    <RequireRole roles={["HOST", "SIDEKICK"]}>
      <JobsInner />
    </RequireRole>
  );
}

function JobsInner() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const { data, loading } = useApi<{ jobs: JobLite[] }>(`/api/jobs?status=${TABS[tab][1]}`);
  const jobs = tab === 0 ? data?.jobs : [...(data?.jobs ?? [])].reverse();
  return (
    <div>
      <PageHeader title="Jobs" />
      <div className="mb-4 flex gap-2">
        {TABS.map(([label], i) => (
          <button key={label} onClick={() => setTab(i)} className={i === tab ? "btn-primary" : "btn-ghost"}>
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <Loading />
      ) : jobs?.length ? (
        <div className="space-y-3">
          {jobs.map((j) => <JobCard key={j.id} job={j} viewer={user!.role} />)}
        </div>
      ) : (
        <Empty>No jobs here yet.</Empty>
      )}
    </div>
  );
}
