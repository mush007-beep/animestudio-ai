export type JobStatus = "queued" | "running" | "done" | "failed";
export type VideoStyle = "anime" | "cinematic";
export type JobType = "text-to-video" | "image-to-video";

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
