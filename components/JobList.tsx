"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Job, VideoEntry } from "@/lib/types";
import { KEYS, useCollection } from "@/lib/store";
import { idbSet, videoBlobKey } from "@/lib/idb";
import { StatusBadge, StyleTag, TypeTag, ModelTag, SpecTag, timeAgo } from "./ui";

/** Escape a prompt for pasting into the worker notebooks' Python config cell. */
function pyString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/**
 * The exact block the Colab / Kaggle / Lightning worker notebooks accept
 * (standalone config cell): PROMPT / STYLE / TYPE / MODEL / DURATION / ASPECT.
 */
function workerPromptBlock(job: Job): string {
  return [
    `PROMPT = "${pyString(job.prompt)}"`,
    `STYLE = "${job.style}"`,
    `TYPE = "${job.type}"`,
    `MODEL = "${job.model ?? "ltx"}"`,
    `DURATION = ${job.duration ?? 8}`,
    `ASPECT = "${job.aspect ?? "16:9"}"`,
    ...(job.type === "image-to-video"
      ? ["# start frame: upload the job's thumbnail in the notebook when it asks"]
      : []),
  ].join("\n");
}

/**
 * Job queue backed by localStorage. In the static build there is no server:
 * - "Create" (or scenes) queues a job.
 * - "Copy worker prompt" copies the notebook-ready config block; marks running.
 * - "Attach finished MP4" imports the worker's MP4 → marks the job done and
 *   adds it to the Library (MP4 bytes go to IndexedDB).
 */
export default function JobList() {
  const jobs = useCollection<Job>(KEYS.jobs);
  const videos = useCollection<VideoEntry>(KEYS.videos);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachTarget, setAttachTarget] = useState<string | null>(null);

  const list = jobs.items;
  const visible = filter === "all" ? list : list.filter((j) => j.status === filter);
  const counts = {
    queued: list.filter((j) => j.status === "queued").length,
    running: list.filter((j) => j.status === "running").length,
    done: list.filter((j) => j.status === "done").length,
    failed: list.filter((j) => j.status === "failed").length,
  };

  function copyWorkerPrompt(job: Job) {
    navigator.clipboard.writeText(workerPromptBlock(job)).catch(() => {});
    setCopiedId(job.id);
    setTimeout(() => setCopiedId((c) => (c === job.id ? null : c)), 2000);
    if (job.status === "queued") {
      jobs.update(job.id, { status: "running", worker: "manual", updated_at: new Date().toISOString() });
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !attachTarget) return;
    setBusyId(attachTarget);
    try {
      const entry: VideoEntry = {
        id: crypto.randomUUID(),
        title: (list.find((j) => j.id === attachTarget)?.prompt ?? "Untitled").slice(0, 80),
        job_id: attachTarget,
        size: file.size,
        created_at: new Date().toISOString(),
      };
      await idbSet(videoBlobKey(entry.id), file);
      videos.add(entry);
      jobs.update(attachTarget, {
        status: "done",
        video_entry_id: entry.id,
        updated_at: new Date().toISOString(),
      });
    } finally {
      setBusyId(null);
      setAttachTarget(null);
    }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="video/mp4,video/*" className="hidden" onChange={onFile} />

      <div className="card mb-4 text-sm text-neutral-400">
        <span className="text-ember font-semibold">How rendering works here:</span> this static
        site has no backend queue. Press <b>Copy worker prompt</b> on a queued job, paste it into a
        worker notebook (Colab / Kaggle / Lightning — standalone mode), download the MP4, then{" "}
        <b>Attach finished MP4</b>. The video lands in your <b>Library</b>.
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        {(["all", "queued", "running", "done", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full border ${
              filter === f
                ? "bg-accent text-white border-accent"
                : "border-line text-neutral-400 hover:bg-panel"
            }`}
          >
            {f} {f !== "all" && `(${(counts as Record<string, number>)[f]})`}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="card text-center text-neutral-500">
          No jobs here yet. Use <Link href="/create" className="text-accent underline">+ Create</Link> to queue your first render.
        </div>
      )}

      <div className="space-y-3">
        {visible.map((job) => (
          <div key={job.id} className="card">
            <div className="flex items-start gap-4">
              {job.start_frame_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={job.start_frame_url}
                  alt="start frame"
                  className="w-28 h-16 object-cover rounded-lg border border-line shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={job.status} />
                  <StyleTag style={job.style} />
                  <TypeTag type={job.type} />
                  <ModelTag model={job.model} />
                  <SpecTag duration={job.duration} aspect={job.aspect} />
                  {job.worker && <span className="text-xs text-neutral-500">worker: {job.worker}</span>}
                </div>
                <p className="mt-2 text-sm text-neutral-300">{job.prompt}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {timeAgo(job.created_at)}
                  {job.error && <span className="text-red-400"> · {job.error}</span>}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                {(job.status === "queued" || job.status === "running") && (
                  <>
                    <button onClick={() => copyWorkerPrompt(job)} className="btn-ghost text-sm" title="Copy the notebook-ready config block; marks running">
                      {copiedId === job.id ? "✅ Copied!" : "📋 Copy worker prompt"}
                    </button>
                    <button
                      onClick={() => {
                        setAttachTarget(job.id);
                        fileRef.current?.click();
                      }}
                      disabled={busyId === job.id}
                      className="btn text-sm"
                    >
                      {busyId === job.id ? "Saving…" : "⬆ Attach finished MP4"}
                    </button>
                    <button
                      onClick={() => jobs.update(job.id, { status: "failed", error: "marked failed by user", updated_at: new Date().toISOString() })}
                      className="btn-ghost text-sm"
                    >
                      Fail
                    </button>
                  </>
                )}
                {job.status === "failed" && (
                  <button
                    onClick={() => jobs.update(job.id, { status: "queued", error: null, updated_at: new Date().toISOString() })}
                    className="btn text-sm"
                  >
                    ↻ Requeue
                  </button>
                )}
                {job.status === "done" && (
                  <Link href="/library" className="btn-ghost text-sm">
                    ▶ Open in Library
                  </Link>
                )}
                <button onClick={() => jobs.remove(job.id)} className="btn-ghost text-sm" title="Delete job">
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
