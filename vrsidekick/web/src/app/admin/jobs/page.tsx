"use client";

import { useState } from "react";
import { RequireRole } from "@/components/AuthProvider";
import { JobCard } from "@/components/JobCard";
import { Empty, Loading, PageHeader, useApi } from "@/components/ui";

export default function AdminJobs() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <Jobs />
    </RequireRole>
  );
}

function Jobs() {
  const [status, setStatus] = useState("");
  const { data, loading } = useApi<{ jobs: any[] }>(`/api/admin/jobs${status ? `?status=${status}` : ""}`);
  return (
    <div>
      <PageHeader
        title="All jobs"
        actions={
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["REQUESTED", "ACCEPTED", "COMPLETED", "DECLINED", "CANCELLED"].map((s) => <option key={s}>{s}</option>)}
          </select>
        }
      />
      {loading ? <Loading /> : data?.jobs.length ? (
        <div className="space-y-3">{data.jobs.map((j) => <JobCard key={j.id} job={j} viewer="ADMIN" />)}</div>
      ) : <Empty>No jobs.</Empty>}
    </div>
  );
}
