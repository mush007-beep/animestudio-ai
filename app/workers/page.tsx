"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Job, WorkerDef } from "@/lib/types";
import { KEYS, useCollection } from "@/lib/store";
import {
  PLATFORM_META,
  seedWorkers,
  workerPromptBlock,
  assignJobToWorker,
  releaseWorker,
} from "@/lib/workers";
import { timeAgo } from "@/components/ui";

function WorkerStatusBadge({ status }: { status: WorkerDef["status"] }) {
  const styles =
    status === "busy"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-neutral-500/15 text-neutral-300 border-neutral-500/30";
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}
    >
      {status === "busy" ? "🟡 BUSY" : "⚪ IDLE"}
    </span>
  );
}

function WorkerCard({
  worker,
  jobs,
  workers,
}: {
  worker: WorkerDef;
  jobs: ReturnType<typeof useCollection<Job>>;
  workers: ReturnType<typeof useCollection<WorkerDef>>;
}) {
  const [copied, setCopied] = useState(false);
  const currentJob = worker.currentJobId
    ? jobs.items.find((j) => j.id === worker.currentJobId) ?? null
    : null;
  const queuedJobs = jobs.items.filter((j) => j.status === "queued");

  function copyCurrentJobPrompt() {
    if (!currentJob) return;
    navigator.clipboard.writeText(workerPromptBlock(currentJob)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl">{PLATFORM_META[worker.platform].icon}</div>
          <h2 className="text-lg font-bold mt-1">{worker.name}</h2>
          <p className="text-xs text-neutral-500">{PLATFORM_META[worker.platform].label}</p>
        </div>
        <WorkerStatusBadge status={worker.status} />
      </div>

      <dl className="text-sm mt-4 space-y-1.5">
        <div className="flex gap-2">
          <dt className="text-neutral-500 w-16 shrink-0">GPU</dt>
          <dd className="text-neutral-200">{worker.gpu}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-neutral-500 w-16 shrink-0">Limits</dt>
          <dd className="text-neutral-400 text-xs leading-5">{worker.limits}</dd>
        </div>
        {worker.lastUsedAt && (
          <div className="flex gap-2">
            <dt className="text-neutral-500 w-16 shrink-0">Last used</dt>
            <dd className="text-neutral-400 text-xs">{timeAgo(worker.lastUsedAt)}</dd>
          </div>
        )}
      </dl>

      <div className="border-t border-line mt-4 pt-4">
        {currentJob ? (
          <div>
            <p className="text-xs text-neutral-500 mb-1">Current job</p>
            <p className="text-sm text-neutral-200 line-clamp-2">{currentJob.prompt}</p>
            <p className="text-xs text-neutral-500 mt-1">
              status: {currentJob.status} · {timeAgo(currentJob.updated_at)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No job assigned — pick a queued job below.</p>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <a
            href={worker.openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn text-sm"
            title={worker.notebookPath ? `Notebook: ${worker.notebookPath}` : undefined}
          >
            📓 Open notebook
          </a>
          <button
            onClick={copyCurrentJobPrompt}
            disabled={!currentJob}
            className="btn-ghost text-sm disabled:opacity-40"
            title="Copy the notebook-ready config block for the assigned job"
          >
            {copied ? "✅ Copied!" : "📋 Copy worker prompt"}
          </button>
          {worker.status === "busy" && (
            <button
              onClick={() => releaseWorker(workers, worker.id)}
              className="btn-ghost text-sm"
              title="Release back to idle (the job keeps its status)"
            >
              Release
            </button>
          )}
        </div>

        <div className="mt-3">
          <label className="text-xs text-neutral-500">Assign a queued job</label>
          <select
            defaultValue=""
            onChange={(e) => {
              const jobId = e.target.value;
              e.target.value = "";
              if (jobId) assignJobToWorker(workers, jobs, worker.id, jobId);
            }}
            className="text-sm mt-1"
            disabled={queuedJobs.length === 0}
          >
            <option value="">
              {queuedJobs.length === 0 ? "No queued jobs" : "Pick a queued job…"}
            </option>
            {queuedJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.prompt.slice(0, 60)}{j.prompt.length > 60 ? "…" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function WorkersPage() {
  // Client-only, idempotent — runs before the collections read localStorage below.
  seedWorkers();
  const workers = useCollection<WorkerDef>(KEYS.workers);
  const jobs = useCollection<Job>(KEYS.jobs);

  // Auto-release: a worker whose job finished (MP4 attached) goes back to idle.
  useEffect(() => {
    workers.items.forEach((w) => {
      if (w.status === "busy" && w.currentJobId) {
        const j = jobs.items.find((x) => x.id === w.currentJobId);
        if (j && (j.status === "done" || j.status === "failed")) {
          releaseWorker(workers, w.id);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workers.items, jobs.items]);

  const busyCount = workers.items.filter((w) => w.status === "busy").length;
  const queuedCount = jobs.items.filter((j) => j.status === "queued").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">⚙️ GPU Workers</h1>
        <span className="text-sm text-neutral-500">
          {busyCount}/{workers.items.length} busy · {queuedCount} queued
        </span>
      </div>

      <div className="card mb-6 text-sm text-neutral-400">
        <span className="text-ember font-semibold">How it works:</span>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>
            Queue a render from <Link href="/create" className="text-accent underline">+ Create</Link>,
            the Dashboard, or a Project scene.
          </li>
          <li>Assign the job to a worker (here, or per job in the Dashboard).</li>
          <li>
            Press <b>📓 Open notebook</b> — the worker notebook opens in a new tab
            (Colab opens straight on the notebook in this repo).
          </li>
          <li>
            Press <b>📋 Copy worker prompt</b>, paste the block into the notebook&apos;s
            config cell, and run it.
          </li>
          <li>
            Download the MP4 and <b>attach it</b> in the Dashboard or Projects — the job
            lands in your <Link href="/library" className="text-accent underline">Library</Link> and
            the worker frees itself.
          </li>
        </ol>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {workers.items.map((w) => (
          <WorkerCard key={w.id} worker={w} jobs={jobs} workers={workers} />
        ))}
      </div>

      <p className="text-xs text-neutral-600 mt-6">
        Notebooks live in the repo under <code>workers/</code> — standalone mode needs no
        server: prompt in, MP4 out.
      </p>
    </div>
  );
}
