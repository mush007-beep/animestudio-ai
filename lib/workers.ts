import { KEYS } from "./store";
import type { Job, WorkerDef, WorkerPlatform } from "./types";

/** Platform icon + label used on worker cards and selects. */
export const PLATFORM_META: Record<WorkerPlatform, { icon: string; label: string }> = {
  colab: { icon: "🟠", label: "Google Colab" },
  kaggle: { icon: "🟦", label: "Kaggle" },
  lightning: { icon: "⚡", label: "Lightning AI" },
};

/** Static worker definitions — runtime state (status/currentJobId) lives in localStorage. */
const DEFS: Omit<WorkerDef, "status" | "currentJobId" | "lastUsedAt" | "created_at">[] = [
  {
    id: "colab-t4",
    name: "Worker 1 — Colab T4",
    platform: "colab",
    gpu: "Tesla T4 15GB",
    limits: "Free tier, ~12h/day, disconnects on idle",
    openUrl:
      "https://colab.research.google.com/github/mush007-beep/animestudio-ai/blob/main/workers/colab-worker.ipynb",
    notebookPath: "workers/colab-worker.ipynb",
  },
  {
    id: "kaggle-p100",
    name: "Worker 2 — Kaggle P100",
    platform: "kaggle",
    gpu: "Tesla P100 16GB",
    limits: "~30 GPU-hr/week free",
    openUrl: "https://github.com/mush007-beep/animestudio-ai/blob/main/workers/kaggle-worker.ipynb",
    notebookPath: "workers/kaggle-worker.ipynb",
  },
  {
    id: "lightning-ai",
    name: "Worker 3 — Lightning AI",
    platform: "lightning",
    gpu: "varies",
    limits: "5 free signup credits, no card; Studio restarts every 4h",
    openUrl: "https://lightning.ai/",
    notebookPath: "workers/lightning-worker.py",
  },
];

/** localStorage marker written once the worker defs have been seeded. */
export const WORKER_SEED_KEY = "as_workers_seeded";

function now(): string {
  return new Date().toISOString();
}

/**
 * Seed the 3 GPU worker defs on first load.
 * Idempotent — guarded by the WORKER_SEED_KEY marker. Safe to call on every render.
 */
export function seedWorkers(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(WORKER_SEED_KEY)) return false;
    const defs: WorkerDef[] = DEFS.map((d) => ({
      ...d,
      status: "idle",
      currentJobId: null,
      lastUsedAt: null,
      created_at: now(),
    }));
    localStorage.setItem(KEYS.workers, JSON.stringify(defs));
    localStorage.setItem(WORKER_SEED_KEY, "1");
    return true;
  } catch (e) {
    console.warn("worker seed failed:", e);
    return false;
  }
}

/** Escape a prompt for pasting into the worker notebooks' Python config cell. */
export function pyString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/**
 * The exact block the Colab / Kaggle / Lightning worker notebooks accept
 * (standalone config cell): PROMPT / STYLE / TYPE / MODEL / DURATION / ASPECT.
 */
export function workerPromptBlock(job: Job): string {
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

/* ------------------------------------------------------------------ */
/* Assign / release logic. Minimal structural types so these work with */
/* any useCollection<WorkerDef> / useCollection<Job> instance.         */
/* ------------------------------------------------------------------ */

export interface WorkerStore {
  items: WorkerDef[];
  update: (id: string, patch: Partial<WorkerDef>) => void;
}

export interface JobStore {
  items: Job[];
  update: (id: string, patch: Partial<Job>) => void;
}

/**
 * Assign a job to a worker: worker → busy with currentJobId, job → "rendering"
 * with the worker's name stamped on it.
 */
export function assignJobToWorker(workers: WorkerStore, jobs: JobStore, workerId: string, jobId: string) {
  const worker = workers.items.find((w) => w.id === workerId);
  const job = jobs.items.find((j) => j.id === jobId);
  if (!worker || !job) return;
  workers.update(workerId, {
    status: "busy",
    currentJobId: jobId,
    lastUsedAt: now(),
  });
  jobs.update(jobId, {
    status: "rendering",
    worker: worker.name,
    updated_at: now(),
  });
}

/**
 * Release a worker back to idle. The job keeps its status ("rendering") —
 * it becomes "done" only when its MP4 is attached in Dashboard / Projects.
 */
export function releaseWorker(workers: WorkerStore, workerId: string) {
  workers.update(workerId, { status: "idle", currentJobId: null });
}
