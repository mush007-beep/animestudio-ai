"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Character,
  Job,
  JobAspect,
  JobDuration,
  JobModel,
  JobType,
  VideoStyle,
} from "@/lib/types";
import { MODEL_LABELS } from "@/lib/types";
import { KEYS, useCollection, fileToDataUrl } from "@/lib/store";

/** Cinematic detail keywords appended by the "Enhance prompt" helper. */
function enhancementFor(style: VideoStyle): string {
  return style === "anime"
    ? "cel-shaded anime key visual, vibrant colors, dynamic composition, clean linework, studio-quality"
    : "cinematic lighting, shallow depth of field, subtle film grain, photorealistic detail, 24fps motion";
}

const STEPS = ["Mode", "Start frame", "Prompt & settings", "Review & queue"] as const;

export default function CreatePage() {
  const router = useRouter();
  const jobs = useCollection<Job>(KEYS.jobs);
  const characters = useCollection<Character>(KEYS.characters);

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<JobType>("text-to-video");
  const [startFrame, setStartFrame] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<VideoStyle>("cinematic");
  const [model, setModel] = useState<JobModel>("ltx");
  const [duration, setDuration] = useState<JobDuration>(8);
  const [aspect, setAspect] = useState<JobAspect>("16:9");
  const [characterId, setCharacterId] = useState<string>("");
  const [enhanced, setEnhanced] = useState(false);

  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>, setter: (u: string) => void) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setter(await fileToDataUrl(f));
  }

  function enhancePrompt() {
    if (!prompt.trim()) return;
    const suffix = enhancementFor(style);
    if (!prompt.includes(suffix)) {
      setPrompt((p) => `${p.replace(/[.\s]+$/, "")}, ${suffix}`);
    }
    setEnhanced(true);
  }

  function onCharacterChange(id: string) {
    // Remove previously appended look description before appending the new one.
    setCharacterId(id);
    setPrompt((p) => {
      const ch = characters.items.find((c) => c.id === id);
      let base = p;
      for (const c of characters.items) {
        const tag = ` [${c.name}: ${c.look_description}]`;
        if (base.endsWith(tag)) base = base.slice(0, -tag.length);
      }
      return ch ? `${base} [${ch.name}: ${ch.look_description}]` : base;
    });
  }

  /** Step flow: frames mode shows step 2, text mode skips it. */
  function goNext() {
    if (step === 0) setStep(mode === "image-to-video" ? 1 : 2);
    else if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  }
  function goBack() {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(mode === "image-to-video" ? 1 : 0);
    else if (step === 1) setStep(0);
  }

  function queueRender() {
    const ch = characters.items.find((c) => c.id === characterId) ?? null;
    jobs.add({
      scene_id: null,
      prompt,
      style,
      type: mode,
      status: "queued",
      worker: null,
      attempts: 0,
      video_entry_id: null,
      error: null,
      start_frame_url: mode === "image-to-video" ? startFrame : null,
      end_frame_url: mode === "image-to-video" ? endFrame : null,
      model,
      duration,
      aspect,
      character_id: ch ? ch.id : null,
      updated_at: new Date().toISOString(),
    });
    router.push("/dashboard");
  }

  const canNext =
    step === 0 ? true : step === 1 ? !!startFrame : step === 2 ? prompt.trim().length > 0 : false;

  const selectedChar = characters.items.find((c) => c.id === characterId) ?? null;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">✨ Create — new render</h1>
      <p className="text-sm text-neutral-500 mb-6">Google Flow-style creation flow: pick a mode, set your shot, queue it for a worker.</p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => {
          const visible = mode === "text-to-video" && i === 1;
          if (visible) return null;
          const active = i === step;
          const done = i < step || (mode === "text-to-video" && step > 1 && i === 1);
          return (
            <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  active ? "bg-accent text-white" : done ? "bg-emerald-600 text-white" : "bg-panel border border-line text-neutral-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${active ? "text-white" : "text-neutral-500"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-line" />}
            </div>
          );
        })}
      </div>

      {/* STEP 1 — Mode */}
      {step === 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("text-to-video")}
            className={`card text-left transition hover:border-accent ${mode === "text-to-video" ? "border-accent ring-2 ring-accent/40" : ""}`}
          >
            <div className="text-4xl mb-3">✏️</div>
            <div className="font-bold text-lg">Text to Video</div>
            <p className="text-sm text-neutral-400 mt-1">Describe the shot in words — the model imagines it from scratch.</p>
          </button>
          <button
            onClick={() => setMode("image-to-video")}
            className={`card text-left transition hover:border-accent ${mode === "image-to-video" ? "border-accent ring-2 ring-accent/40" : ""}`}
          >
            <div className="text-4xl mb-3">🖼️</div>
            <div className="font-bold text-lg">Frames to Video</div>
            <p className="text-sm text-neutral-400 mt-1">Animate your own start frame — exact first frame, locked continuity.</p>
          </button>
        </div>
      )}

      {/* STEP 2 — Start frame */}
      {step === 1 && (
        <div className="card">
          <h2 className="font-bold mb-1">Start frame</h2>
          <p className="text-sm text-neutral-500 mb-4">This image becomes the video&apos;s exact first frame.</p>
          <input ref={startRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e, setStartFrame)} />
          <input ref={endRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e, setEndFrame)} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label>Start frame (required)</label>
              {startFrame ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={startFrame} alt="start frame" className="rounded-lg border border-line w-full" />
                  <button onClick={() => startRef.current?.click()} className="btn-ghost text-sm mt-2">Change</button>
                </div>
              ) : (
                <button onClick={() => startRef.current?.click()} className="w-full border-2 border-dashed border-line rounded-lg py-10 text-neutral-500 hover:border-accent hover:text-neutral-300">
                  📤 Upload start frame
                </button>
              )}
            </div>
            <div>
              <label>End frame (optional)</label>
              {endFrame ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={endFrame} alt="end frame" className="rounded-lg border border-line w-full" />
                  <button onClick={() => setEndFrame(null)} className="btn-ghost text-sm mt-2">Remove</button>
                </div>
              ) : (
                <button onClick={() => endRef.current?.click()} className="w-full border-2 border-dashed border-line rounded-lg py-10 text-neutral-500 hover:border-accent hover:text-neutral-300">
                  📤 Upload end frame
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 — Prompt & settings */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="card">
            <label>Prompt</label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setEnhanced(false); }}
              placeholder={mode === "image-to-video" ? "Describe the motion: e.g. Slow push-in, embers rising, camera drifts left…" : "Describe the shot: e.g. A rainy neon-lit street at night, a couple sharing an umbrella…"}
            />
            <button onClick={enhancePrompt} disabled={!prompt.trim()} className="btn-ghost text-sm mt-2">
              ✨ Enhance prompt{enhanced ? " ✓" : ""}
            </button>
          </div>

          <div className="card">
            <label>Style</label>
            <div className="grid grid-cols-2 gap-3">
              {([["cinematic", "🎬", "Realistic Cinematic"], ["anime", "🎌", "Japanese Anime"]] as [VideoStyle, string, string][]).map(([v, icon, label]) => (
                <button
                  key={v}
                  onClick={() => setStyle(v)}
                  className={`rounded-lg border px-4 py-3 text-left transition ${style === v ? "border-accent bg-accent/10 ring-1 ring-accent/40" : "border-line hover:border-neutral-500"}`}
                >
                  <span className="text-2xl">{icon}</span>
                  <div className="font-semibold text-sm mt-1">{label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <label>Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value as JobModel)}>
              <option value="ltx">{MODEL_LABELS.ltx}</option>
              <option value="wan21">{MODEL_LABELS.wan21}</option>
            </select>
            <p className="text-xs text-neutral-500 mt-1">Matches the worker notebooks in <code>workers/</code>.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card">
              <label>Duration</label>
              <div className="flex gap-2">
                {([4, 8] as JobDuration[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 rounded-lg border px-4 py-2 font-semibold transition ${duration === d ? "border-accent bg-accent/10 text-white" : "border-line text-neutral-400 hover:border-neutral-500"}`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div className="card">
              <label>Aspect ratio</label>
              <div className="flex gap-2">
                {(["16:9", "9:16", "1:1"] as JobAspect[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAspect(a)}
                    className={`flex-1 rounded-lg border px-2 py-2 font-semibold text-sm transition ${aspect === a ? "border-accent bg-accent/10 text-white" : "border-line text-neutral-400 hover:border-neutral-500"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <label>Character reference (optional — locks continuity)</label>
            <select value={characterId} onChange={(e) => onCharacterChange(e.target.value)}>
              <option value="">None</option>
              {characters.items.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedChar && (
              <p className="text-xs text-neutral-500 mt-2">
                Look appended to prompt: <span className="text-neutral-300">{selectedChar.look_description}</span>
              </p>
            )}
            {characters.items.length === 0 && (
              <p className="text-xs text-neutral-600 mt-1">No characters saved yet — add them on the Characters page.</p>
            )}
          </div>
        </div>
      )}

      {/* STEP 4 — Review & queue */}
      {step === 3 && (
        <div className="card">
          <h2 className="font-bold mb-4">Review your shot</h2>
          <div className="flex gap-4 flex-wrap">
            {startFrame && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={startFrame} alt="start frame" className="w-40 rounded-lg border border-line" />
            )}
            <dl className="text-sm space-y-1.5 flex-1 min-w-[200px]">
              <div className="flex gap-2"><dt className="text-neutral-500 w-24 shrink-0">Mode</dt><dd>{mode === "image-to-video" ? "🖼→🎞 Frames to Video" : "✏️→🎞 Text to Video"}</dd></div>
              <div className="flex gap-2"><dt className="text-neutral-500 w-24 shrink-0">Style</dt><dd>{style === "anime" ? "🎌 Japanese Anime" : "🎬 Realistic Cinematic"}</dd></div>
              <div className="flex gap-2"><dt className="text-neutral-500 w-24 shrink-0">Model</dt><dd>{MODEL_LABELS[model]}</dd></div>
              <div className="flex gap-2"><dt className="text-neutral-500 w-24 shrink-0">Duration</dt><dd>{duration}s</dd></div>
              <div className="flex gap-2"><dt className="text-neutral-500 w-24 shrink-0">Aspect</dt><dd>{aspect}</dd></div>
              <div className="flex gap-2"><dt className="text-neutral-500 w-24 shrink-0">Character</dt><dd>{selectedChar ? selectedChar.name : "—"}</dd></div>
              <div className="flex gap-2"><dt className="text-neutral-500 w-24 shrink-0">End frame</dt><dd>{endFrame ? "✓ attached" : "—"}</dd></div>
            </dl>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-ink border border-line text-sm text-neutral-300 whitespace-pre-wrap">{prompt}</div>
          <button onClick={queueRender} className="btn w-full mt-4 text-lg py-3">
            🎬 Queue Render
          </button>
          <p className="text-xs text-neutral-500 mt-2 text-center">The job lands in the Dashboard queue — render it in a worker notebook, then attach the MP4.</p>
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex justify-between mt-6">
        <button onClick={goBack} disabled={step === 0} className="btn-ghost">
          ← Back
        </button>
        {step < 3 && (
          <button onClick={goNext} disabled={!canNext} className="btn">
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
