"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  Character,
  Episode,
  Job,
  JobAspect,
  JobDuration,
  JobModel,
  Project,
  ProjectScene,
  ProjectSceneStatus,
  VideoEntry,
  WorkerDef,
} from "@/lib/types";
import { MODEL_LABELS } from "@/lib/types";
import { KEYS, useCollection } from "@/lib/store";
import { idbDel, idbSet, videoBlobKey } from "@/lib/idb";
import { seedSeriesProjects, sceneStartFrameKey } from "@/lib/seed";
import { seedWorkers } from "@/lib/workers";
import WorkerAssign from "@/components/WorkerAssign";

function pyString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/** Downscale an image file to a small data-URL thumbnail for localStorage. */
function makeThumbnail(file: File, maxDim = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")?.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not read image"));
    };
    img.src = url;
  });
}

function SceneStatusBadge({ status }: { status: ProjectSceneStatus }) {
  const styles: Record<ProjectSceneStatus, string> = {
    pending: "bg-neutral-600/20 text-neutral-300 border-neutral-500/30",
    queued: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    rendering: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    done: "bg-green-500/15 text-green-300 border-green-500/30",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}
    >
      {status.toUpperCase()}
    </span>
  );
}

/** Full prompt = shot prompt + locked character look references. */
function finalPrompt(scene: ProjectScene): string {
  const refs = scene.characterRefs.map((r) => ` [${r}]`).join("");
  return `${scene.prompt.trim()}${refs}`;
}

/** Same notebook-ready config block style as the job queue's "Copy worker prompt". */
function sceneWorkerBlock(scene: ProjectScene): string {
  const lines = [
    `PROMPT = "${pyString(finalPrompt(scene))}"`,
    `STYLE = "cinematic"`,
    `TYPE = "${scene.startFrameId ? "image-to-video" : "text-to-video"}"`,
    `MODEL = "${scene.settings.model}"`,
    `DURATION = ${scene.settings.duration}`,
    `ASPECT = "${scene.settings.aspect}"`,
  ];
  if (scene.startFrameId) {
    lines.push(
      "# start frame: re-upload the scene's start frame in the notebook when it asks"
    );
  }
  return lines.join("\n");
}

type Collections = {
  projects: ReturnType<typeof useCollection<Project>>;
  episodes: ReturnType<typeof useCollection<Episode>>;
  scenes: ReturnType<typeof useCollection<ProjectScene>>;
  jobs: ReturnType<typeof useCollection<Job>>;
  videos: ReturnType<typeof useCollection<VideoEntry>>;
  characters: ReturnType<typeof useCollection<Character>>;
  workers: ReturnType<typeof useCollection<WorkerDef>>;
};

function refEntry(c: Character): string {
  return `${c.name} — ${c.look_description}`;
}

function SceneEditor({
  scene,
  onClose,
  cols,
}: {
  scene: ProjectScene;
  onClose: () => void;
  cols: Collections;
}) {
  const { scenes, jobs, videos, characters, workers } = cols;
  const startRef = useRef<HTMLInputElement>(null);
  const clipRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customRef, setCustomRef] = useState("");

  const linkedJob = scene.jobId ? jobs.items.find((j) => j.id === scene.jobId) : null;
  const update = (patch: Partial<ProjectScene>) => scenes.update(scene.id, patch);

  function toggleCharacter(c: Character) {
    const entry = refEntry(c);
    const has = scene.characterRefs.some((r) => r.startsWith(`${c.name} —`));
    update({
      characterRefs: has
        ? scene.characterRefs.filter((r) => !r.startsWith(`${c.name} —`))
        : [...scene.characterRefs, entry],
    });
  }

  async function uploadStartFrame(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await idbSet(sceneStartFrameKey(scene.id), file);
      const thumb = await makeThumbnail(file);
      update({ startFrameId: sceneStartFrameKey(scene.id), startFrameThumb: thumb });
    } finally {
      setBusy(false);
    }
  }

  async function removeStartFrame() {
    await idbDel(sceneStartFrameKey(scene.id));
    update({ startFrameId: null, startFrameThumb: null });
  }

  function copyWorkerPrompt() {
    navigator.clipboard.writeText(sceneWorkerBlock(scene)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function queueRender() {
    const job = jobs.add({
      scene_id: scene.id,
      prompt: finalPrompt(scene),
      style: "cinematic",
      type: scene.startFrameId ? "image-to-video" : "text-to-video",
      status: "queued",
      worker: null,
      attempts: 0,
      video_entry_id: null,
      error: null,
      start_frame_url: scene.startFrameThumb ?? null,
      end_frame_url: null,
      model: scene.settings.model,
      duration: scene.settings.duration,
      aspect: scene.settings.aspect,
      character_id: null,
      updated_at: new Date().toISOString(),
    });
    update({ status: "queued", jobId: job.id });
  }

  async function attachClip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const entry: VideoEntry = {
        id: crypto.randomUUID(),
        title: `S${scene.number} — ${scene.title}`.slice(0, 80),
        job_id: scene.jobId ?? null,
        size: file.size,
        created_at: new Date().toISOString(),
      };
      await idbSet(videoBlobKey(entry.id), file);
      videos.add(entry);
      if (scene.jobId) {
        jobs.update(scene.jobId, {
          status: "done",
          video_entry_id: entry.id,
          updated_at: new Date().toISOString(),
        });
      }
      update({ status: "done", clipId: entry.id });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-3xl my-8 max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold">
              Scene {scene.number} — {scene.title}
            </h2>
            <div className="mt-1">
              <SceneStatusBadge status={scene.status} />
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost text-sm">
            ✕ Close
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label>Number</label>
              <input
                type="number"
                min={1}
                value={scene.number}
                onChange={(e) => update({ number: Number(e.target.value) || 1 })}
              />
            </div>
            <div className="sm:col-span-2">
              <label>Title</label>
              <input value={scene.title} onChange={(e) => update({ title: e.target.value })} />
            </div>
          </div>

          <div>
            <label>Description</label>
            <textarea
              rows={3}
              value={scene.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="What happens in this scene?"
            />
          </div>

          <div>
            <label>Shot prompt (for the video generator)</label>
            <textarea
              rows={4}
              value={scene.prompt}
              onChange={(e) => update({ prompt: e.target.value })}
              placeholder="Describe the shot: framing, camera move, lighting, motion…"
            />
          </div>

          <div className="card !p-4">
            <label>Character references (auto-appended to the prompt)</label>
            {characters.items.length === 0 && (
              <p className="text-xs text-neutral-600 mb-2">
                No characters saved — add them on the Characters page, or add a custom
                reference below.
              </p>
            )}
            <div className="flex flex-wrap gap-2 mb-3">
              {characters.items.map((c) => {
                const on = scene.characterRefs.some((r) => r.startsWith(`${c.name} —`));
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCharacter(c)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      on
                        ? "bg-accent/20 border-accent text-white"
                        : "border-line text-neutral-400 hover:border-neutral-500"
                    }`}
                  >
                    {on ? "✓ " : ""}{c.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                value={customRef}
                onChange={(e) => setCustomRef(e.target.value)}
                placeholder="Custom look reference, e.g. Villager — old, grey shawl…"
              />
              <button
                onClick={() => {
                  if (customRef.trim()) {
                    update({ characterRefs: [...scene.characterRefs, customRef.trim()] });
                    setCustomRef("");
                  }
                }}
                className="btn-ghost text-sm shrink-0"
              >
                Add
              </button>
            </div>
            {scene.characterRefs.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-neutral-400">
                {scene.characterRefs.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-1">[{r}]</span>
                    <button
                      onClick={() =>
                        update({ characterRefs: scene.characterRefs.filter((_, j) => j !== i) })
                      }
                      className="text-neutral-600 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label>Model</label>
              <select
                value={scene.settings.model}
                onChange={(e) =>
                  update({
                    settings: { ...scene.settings, model: e.target.value as JobModel },
                  })
                }
              >
                <option value="ltx">{MODEL_LABELS.ltx}</option>
                <option value="wan21">{MODEL_LABELS.wan21}</option>
              </select>
            </div>
            <div>
              <label>Duration</label>
              <div className="flex gap-2">
                {([4, 8] as JobDuration[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => update({ settings: { ...scene.settings, duration: d } })}
                    className={`flex-1 rounded-lg border px-4 py-2 font-semibold transition ${
                      scene.settings.duration === d
                        ? "border-accent bg-accent/10 text-white"
                        : "border-line text-neutral-400 hover:border-neutral-500"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Aspect</label>
              <div className="flex gap-2">
                {(["16:9", "9:16", "1:1"] as JobAspect[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => update({ settings: { ...scene.settings, aspect: a } })}
                    className={`flex-1 rounded-lg border px-2 py-2 font-semibold text-sm transition ${
                      scene.settings.aspect === a
                        ? "border-accent bg-accent/10 text-white"
                        : "border-line text-neutral-400 hover:border-neutral-500"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label>Start frame (locked first frame — stored in IndexedDB)</label>
            <input
              ref={startRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadStartFrame}
            />
            {scene.startFrameThumb ? (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={scene.startFrameThumb}
                  alt="start frame"
                  className="w-40 rounded-lg border border-line"
                />
                <div className="flex flex-col gap-2">
                  <button onClick={() => startRef.current?.click()} className="btn-ghost text-sm">
                    Change
                  </button>
                  <button onClick={removeStartFrame} className="btn-ghost text-sm">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => startRef.current?.click()}
                disabled={busy}
                className="w-full border-2 border-dashed border-line rounded-lg py-8 text-neutral-500 hover:border-accent hover:text-neutral-300"
              >
                {busy ? "Saving…" : "📤 Upload start frame"}
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label>Status</label>
              <select
                value={scene.status}
                onChange={(e) => update({ status: e.target.value as ProjectSceneStatus })}
              >
                {(["pending", "queued", "rendering", "done"] as ProjectSceneStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Notes</label>
              <input
                value={scene.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="e.g. retake needed — face drift"
              />
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <label>Render pipeline</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={copyWorkerPrompt} className="btn-ghost text-sm">
                {copied ? "✅ Copied!" : "📋 Copy worker prompt"}
              </button>
              <button
                onClick={queueRender}
                disabled={scene.status === "queued" || scene.status === "rendering"}
                className="btn text-sm"
              >
                🎬 Queue Render
              </button>
              {linkedJob &&
                (linkedJob.status === "queued" ||
                  linkedJob.status === "rendering" ||
                  linkedJob.status === "running") && (
                  <WorkerAssign job={linkedJob} jobs={jobs} workers={workers} />
                )}
              <input
                ref={clipRef}
                type="file"
                accept="video/mp4,video/*"
                className="hidden"
                onChange={attachClip}
              />
              <button
                onClick={() => clipRef.current?.click()}
                disabled={busy}
                className="btn-ghost text-sm"
              >
                {busy ? "Saving…" : "⬆ Attach finished MP4"}
              </button>
              {linkedJob && (
                <span className="text-xs text-neutral-500 self-center">
                  job: {linkedJob.status}
                  {linkedJob.video_entry_id ? " · in Library" : ""}
                </span>
              )}
              {scene.clipId && !linkedJob && (
                <Link href="/library" className="btn-ghost text-sm">
                  ▶ Open clip in Library
                </Link>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Copy the worker prompt → paste into a notebook (Colab / Kaggle / Lightning) or
              Google Flow → attach the finished MP4. The clip lands in your Library and this
              scene is marked done.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                if (scene.jobId) jobs.remove(scene.jobId);
                if (scene.startFrameId) idbDel(sceneStartFrameKey(scene.id));
                scenes.remove(scene.id);
                onClose();
              }}
              className="btn-ghost text-sm text-red-400 hover:border-red-500"
            >
              🗑 Delete scene
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EpisodeBlock({
  episode,
  scenes,
  cols,
  editingScene,
  setEditingScene,
  onDeleteEpisode,
}: {
  episode: Episode;
  scenes: ProjectScene[];
  cols: Collections;
  editingScene: string | null;
  setEditingScene: (id: string | null) => void;
  onDeleteEpisode: (ep: Episode) => void;
}) {
  const epScenes = useMemo(
    () => scenes.filter((s) => s.episodeId === episode.id).sort((a, b) => a.number - b.number),
    [scenes, episode.id]
  );
  const [open, setOpen] = useState(false);
  const [editingEp, setEditingEp] = useState(false);
  const done = epScenes.filter((s) => s.status === "done").length;

  function addScene() {
    const next = epScenes.length ? Math.max(...epScenes.map((s) => s.number)) + 1 : 1;
    const created = cols.scenes.add({
      episodeId: episode.id,
      number: next,
      title: `Scene ${next}`,
      description: "",
      prompt: "",
      characterRefs: [],
      startFrameId: null,
      startFrameThumb: null,
      settings: { model: "ltx", duration: 8, aspect: "16:9" },
      status: "pending",
      jobId: null,
      clipId: null,
      notes: "",
    });
    setOpen(true);
    setEditingScene(created.id);
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => setOpen((o) => !o)} className="text-left flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-lg">{open ? "▾" : "▸"}</span>
            <h3 className="text-lg font-bold">
              Episode {episode.number} — {episode.title}
            </h3>
            <span className="text-xs text-neutral-500">
              {done}/{epScenes.length} scenes done
            </span>
          </div>
          {episode.synopsis && (
            <p className="text-sm text-neutral-500 mt-1 ml-8">{episode.synopsis}</p>
          )}
        </button>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditingEp((e) => !e)} className="btn-ghost text-sm">
            ✏️
          </button>
        </div>
      </div>

      {editingEp && (
        <EpisodeEditForm
          episode={episode}
          episodes={cols.episodes}
          onDone={() => setEditingEp(false)}
          onDeleteEpisode={onDeleteEpisode}
        />
      )}

      {open && (
        <div className="mt-4 ml-2 space-y-2">
          {epScenes.length === 0 && (
            <p className="text-sm text-neutral-600">No scenes yet — add the first one below.</p>
          )}
          {epScenes.map((s) => (
            <div key={s.id}>
              <button
                onClick={() => setEditingScene(editingScene === s.id ? null : s.id)}
                className="w-full flex items-center gap-3 rounded-lg border border-line px-3 py-2 hover:border-accent transition text-left"
              >
                <span className="text-xs text-neutral-500 w-8 shrink-0">#{s.number}</span>
                {s.startFrameThumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.startFrameThumb}
                    alt=""
                    className="w-14 h-9 object-cover rounded border border-line shrink-0"
                  />
                )}
                <span className="flex-1 text-sm font-medium truncate">{s.title}</span>
                {s.clipId && <span className="text-xs text-emerald-400">🎞 clip</span>}
                <SceneStatusBadge status={s.status} />
              </button>
              {editingScene === s.id && (
                <SceneEditor scene={s} cols={cols} onClose={() => setEditingScene(null)} />
              )}
            </div>
          ))}
          <button onClick={addScene} className="btn-ghost text-sm mt-2">
            + Add scene
          </button>
        </div>
      )}
    </div>
  );
}

function EpisodeEditForm({
  episode,
  episodes,
  onDone,
  onDeleteEpisode,
}: {
  episode: Episode;
  episodes: ReturnType<typeof useCollection<Episode>>;
  onDone: () => void;
  onDeleteEpisode: (ep: Episode) => void;
}) {
  const [title, setTitle] = useState(episode.title);
  const [synopsis, setSynopsis] = useState(episode.synopsis);
  return (
    <div className="card !p-4 mt-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label>Episode number</label>
          <input
            type="number"
            min={1}
            defaultValue={episode.number}
            onChange={(e) => episodes.update(episode.id, { number: Number(e.target.value) || 1 })}
          />
        </div>
        <div className="sm:col-span-2">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <label>Synopsis</label>
        <textarea rows={2} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
      </div>
      <div className="flex justify-between mt-3">
        <button
          onClick={() => {
            if (confirm(`Delete Episode ${episode.number} and all its scenes?`)) {
              onDeleteEpisode(episode);
              onDone();
            }
          }}
          className="btn-ghost text-sm text-red-400"
        >
          🗑 Delete episode
        </button>
        <button
          onClick={() => {
            episodes.update(episode.id, { title: title.trim() || episode.title, synopsis });
            onDone();
          }}
          className="btn text-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function ProjectDetail({ projectId }: { projectId: string }) {
  // Client-only, idempotent — seeds the 3 worker defs before collections read localStorage.
  seedWorkers();
  const projects = useCollection<Project>(KEYS.projects);
  const episodes = useCollection<Episode>(KEYS.episodes);
  const scenes = useCollection<ProjectScene>(KEYS.projectScenes);
  const jobs = useCollection<Job>(KEYS.jobs);
  const videos = useCollection<VideoEntry>(KEYS.videos);
  const characters = useCollection<Character>(KEYS.characters);
  const workers = useCollection<WorkerDef>(KEYS.workers);

  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [newEpTitle, setNewEpTitle] = useState("");
  const [newEpSynopsis, setNewEpSynopsis] = useState("");

  const project = projects.items.find((p) => p.id === projectId);
  const cols: Collections = { projects, episodes, scenes, jobs, videos, characters, workers };

  const eps = useMemo(
    () =>
      episodes.items
        .filter((e) => e.projectId === projectId)
        .sort((a, b) => a.number - b.number),
    [episodes.items, projectId]
  );

  function deleteEpisode(ep: Episode) {
    scenes.items
      .filter((s) => s.episodeId === ep.id)
      .forEach((s) => {
        if (s.jobId) jobs.remove(s.jobId);
        if (s.startFrameId) idbDel(sceneStartFrameKey(s.id));
        scenes.remove(s.id);
      });
    episodes.remove(ep.id);
  }

  if (!project) {
    return (
      <div className="card text-center">
        <p className="text-neutral-400 mb-4">Project not found.</p>
        <Link href="/projects" className="btn">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  function addEpisode() {
    const next = eps.length ? Math.max(...eps.map((e) => e.number)) + 1 : 1;
    episodes.add({
      projectId: project!.id,
      number: next,
      title: newEpTitle.trim() || `Episode ${next}`,
      synopsis: newEpSynopsis.trim(),
    });
    setNewEpTitle("");
    setNewEpSynopsis("");
  }

  return (
    <div>
      <Link href="/projects" className="text-sm text-neutral-500 hover:text-accent">
        ← Projects
      </Link>
      <h1 className="text-2xl font-bold mt-2">{project.name}</h1>
      <p className="text-xs text-accent mt-1">{project.style}</p>
      <p className="text-sm text-neutral-400 mt-2 max-w-3xl">{project.description}</p>

      <div className="card mt-6">
        <h2 className="font-bold mb-3">+ Add episode</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label>Title</label>
            <input
              value={newEpTitle}
              onChange={(e) => setNewEpTitle(e.target.value)}
              placeholder={`Episode ${eps.length + 1}`}
            />
          </div>
          <div className="sm:col-span-2">
            <label>Synopsis</label>
            <input
              value={newEpSynopsis}
              onChange={(e) => setNewEpSynopsis(e.target.value)}
              placeholder="What happens in this episode?"
            />
          </div>
        </div>
        <button onClick={addEpisode} className="btn mt-3 text-sm">
          Add episode
        </button>
      </div>

      <div className="space-y-4 mt-6">
        {eps.map((ep) => (
          <EpisodeBlock
            key={ep.id}
            episode={ep}
            scenes={scenes.items}
            cols={cols}
            editingScene={editingScene}
            setEditingScene={setEditingScene}
            onDeleteEpisode={deleteEpisode}
          />
        ))}
      </div>
    </div>
  );
}

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedSeriesProjects();
    setReady(true);
  }, []);

  if (!ready) return <div className="card text-neutral-500">Loading project…</div>;
  return <ProjectDetail projectId={projectId} />;
}
