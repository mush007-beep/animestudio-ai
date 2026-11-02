export type JobStatus = "queued" | "rendering" | "running" | "done" | "failed";
export type VideoStyle = "anime" | "cinematic";
export type JobType = "text-to-video" | "image-to-video";
export type JobModel = "ltx" | "wan21";
export type JobDuration = 4 | 8;
export type JobAspect = "16:9" | "9:16" | "1:1";

export const MODEL_LABELS: Record<JobModel, string> = {
  ltx: "LTX-Video (fast)",
  wan21: "Wan 2.1 (quality)",
};

export interface Character {
  id: string;
  name: string;
  look_description: string;
  /** data-URL (localStorage) or remote URL */
  reference_image_url: string | null;
  created_at: string;
}

export interface Scene {
  id: string;
  title: string;
  prompt: string;
  style: VideoStyle;
  type: JobType;
  character_id: string | null;
  /** data-URL (localStorage) or remote URL — start frame for image-to-video */
  start_image_url: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  scene_id: string | null;
  prompt: string;
  style: VideoStyle;
  type: JobType;
  status: JobStatus;
  worker: string | null;
  attempts: number;
  /** localStorage/IndexedDB video entry id once an MP4 is attached */
  video_entry_id: string | null;
  error: string | null;
  /** start-frame thumbnail (data-URL) for image-to-video jobs */
  start_frame_url?: string | null;
  /** end-frame thumbnail (data-URL), optional */
  end_frame_url?: string | null;
  model?: JobModel | null;
  duration?: JobDuration | null;
  aspect?: JobAspect | null;
  character_id?: string | null;
  created_at: string;
  updated_at: string;
}

/** Finished-video metadata. The MP4 blob lives in IndexedDB under `video:<id>`. */
export interface VideoEntry {
  id: string;
  title: string;
  job_id: string | null;
  size: number;
  created_at: string;
}

/** Shape a GPU worker receives from the FUTURE server API (docs/api-spec.md). */
export interface WorkerJobPayload {
  id: string;
  prompt: string;
  style: VideoStyle;
  type: JobType;
  character_reference_url: string | null;
  start_image_url: string | null;
}

/* ------------------------------------------------------------------ */
/* GPU Workers — free-tier notebooks that render queued jobs.           */
/* WorkerDef holds the static def plus runtime state; static defs live */
/* in lib/workers.ts, runtime state persists in localStorage.           */
/* ------------------------------------------------------------------ */

export type WorkerPlatform = "colab" | "kaggle" | "lightning";
export type WorkerRuntimeStatus = "idle" | "busy";

export interface WorkerDef {
  id: string;
  /** e.g. "Worker 1 — Colab T4" */
  name: string;
  platform: WorkerPlatform;
  /** e.g. "Tesla T4 15GB" */
  gpu: string;
  /** free-tier limits, e.g. "Free tier, ~12h/day, disconnects on idle" */
  limits: string;
  /** URL opened by "Open notebook" (notebook blob or platform home) */
  openUrl: string;
  /** path inside the repo, e.g. "workers/colab-worker.ipynb" */
  notebookPath?: string;
  status: WorkerRuntimeStatus;
  /** id of the queued job currently assigned, if any */
  currentJobId: string | null;
  lastUsedAt: string | null;
  created_at: string;
}
/* ------------------------------------------------------------------ */
/* Series Projects — Google Flow-style production tracking            */
/* Project → Episodes → Scenes. Actual rendering stays external        */
/* (Google Flow / VidoGrid / worker notebooks); this layer organizes,  */
/* tracks status, and prepares worker-ready prompts.                   */
/* ------------------------------------------------------------------ */

export type ProjectSceneStatus = "pending" | "queued" | "rendering" | "done";

export interface Project {
  id: string;
  name: string;
  description: string;
  /** free-form style label, e.g. "Cinematic photorealistic (Mythra Films style)" */
  style: string;
  created_at: string;
}

export interface Episode {
  id: string;
  projectId: string;
  number: number;
  title: string;
  synopsis: string;
  created_at: string;
}

export interface ProjectScene {
  id: string;
  episodeId: string;
  number: number;
  title: string;
  description: string;
  /** shot prompt for the video generator (motion + framing + look) */
  prompt: string;
  /** character look references, e.g. "Zara — 19, deep brown eyes, long black braid…" */
  characterRefs: string[];
  /** IndexedDB key of the full start-frame image blob (`scenestartframe:<id>`) */
  startFrameId?: string | null;
  /** small data-URL thumbnail of the start frame (localStorage-safe) */
  startFrameThumb?: string | null;
  settings: {
    model: JobModel;
    duration: JobDuration;
    aspect: JobAspect;
  };
  status: ProjectSceneStatus;
  /** id of the render job in the job queue, if queued */
  jobId?: string | null;
  /** id of the finished VideoEntry (MP4 blob in IndexedDB under `video:<clipId>`) */
  clipId?: string | null;
  notes: string;
  created_at: string;
}
