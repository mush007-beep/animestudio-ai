"use client";

import type { Job } from "@/lib/types";
import {
  assignJobToWorker,
  releaseWorker,
  PLATFORM_META,
  type JobStore,
  type WorkerStore,
} from "@/lib/workers";

/**
 * Per-job worker control: shows the assigned worker with a Release button,
 * or an "Assign to worker…" select when unassigned.
 * Release frees the worker; the job keeps its status until its MP4 is attached.
 */
export default function WorkerAssign({
  job,
  jobs,
  workers,
}: {
  job: Job;
  jobs: JobStore;
  workers: WorkerStore;
}) {
  const assigned = workers.items.find((w) => w.currentJobId === job.id) ?? null;

  if (assigned) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs text-neutral-400">⚙️ {assigned.name}</span>
        <button
          onClick={() => releaseWorker(workers, assigned.id)}
          className="btn-ghost text-sm"
          title="Release this worker back to idle (job keeps its status)"
        >
          Release
        </button>
      </span>
    );
  }

  return (
    <select
      defaultValue=""
      onChange={(e) => {
        const workerId = e.target.value;
        e.target.value = "";
        if (workerId) assignJobToWorker(workers, jobs, workerId, job.id);
      }}
      className="text-sm max-w-[190px]"
      title="Assign this job to a GPU worker (job → rendering, worker → busy)"
    >
      <option value="">Assign to worker…</option>
      {workers.items.map((w) => (
        <option key={w.id} value={w.id}>
          {PLATFORM_META[w.platform].icon} {w.name}
          {w.status === "busy" ? " (busy)" : ""}
        </option>
      ))}
    </select>
  );
}
