"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Character, Job, Scene } from "@/lib/types";
import { KEYS, fileToDataUrl, useCollection } from "@/lib/store";
import { StyleTag, TypeTag, timeAgo } from "./ui";

export default function SceneManager() {
  const router = useRouter();
  const scenes = useCollection<Scene>(KEYS.scenes);
  const characters = useCollection<Character>(KEYS.characters);
  const jobs = useCollection<Job>(KEYS.jobs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    prompt: "",
    style: "cinematic",
    type: "text-to-video",
    character_id: "",
    start_image_url: "",
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) {
      setError("Image is large for browser storage — it may not persist. Prefer < 2 MB.");
    }
    const url = await fileToDataUrl(file);
    setForm((f) => ({ ...f, start_image_url: url }));
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    scenes.add({
      title: form.title,
      prompt: form.prompt,
      style: form.style as Scene["style"],
      type: form.type as Scene["type"],
      character_id: form.character_id || null,
      start_image_url: form.start_image_url || null,
    });
    setForm({ title: "", prompt: "", style: "cinematic", type: "text-to-video", character_id: "", start_image_url: "" });
    setBusy(false);
  }

  function queue(scene: Scene) {
    jobs.add({
      scene_id: scene.id,
      prompt: scene.prompt,
      style: scene.style,
      type: scene.type,
      status: "queued",
      worker: null,
      attempts: 0,
      video_entry_id: null,
      error: null,
      updated_at: new Date().toISOString(),
    });
    router.push("/dashboard");
  }

  const charName = (id: string | null) => characters.items.find((c) => c.id === id)?.name;

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <form onSubmit={create} className="card lg:col-span-2 space-y-3 h-fit">
        <h2 className="text-lg font-bold">New scene</h2>
        <div>
          <label>Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ember crater — night" required />
        </div>
        <div>
          <label>Prompt (paste into the worker notebook in standalone mode)</label>
          <textarea rows={4} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="Slow aerial drift over a smouldering crater…" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label>Style</label>
            <select value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}>
              <option value="cinematic">🎬 Realistic cinematic</option>
              <option value="anime">🎌 Japanese anime</option>
            </select>
          </div>
          <div>
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="text-to-video">✏️ Text-to-video</option>
              <option value="image-to-video">🖼 Image-to-video</option>
            </select>
          </div>
        </div>
        <div>
          <label>Character reference (continuity)</label>
          <select value={form.character_id} onChange={(e) => setForm({ ...form, character_id: e.target.value })}>
            <option value="">— none —</option>
            {characters.items.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Start image (for image-to-video)</label>
          <input type="file" accept="image/*" onChange={onFile} />
          {form.start_image_url && (
            <img src={form.start_image_url} alt="start frame" className="mt-2 rounded-lg max-h-32" />
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="btn w-full" disabled={busy}>
          {busy ? "Saving…" : "Save scene"}
        </button>
      </form>

      <div className="lg:col-span-3 space-y-3">
        <h2 className="text-lg font-bold">Scenes ({scenes.items.length})</h2>
        {scenes.items.map((s) => (
          <div key={s.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">{s.title}</h3>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <StyleTag style={s.style} />
                  <TypeTag type={s.type} />
                  {charName(s.character_id) && (
                    <span className="text-xs text-neutral-400">👤 {charName(s.character_id)}</span>
                  )}
                </div>
                <p className="text-sm text-neutral-400 mt-2">{s.prompt}</p>
                <p className="text-xs text-neutral-600 mt-1">{timeAgo(s.created_at)}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {s.start_image_url && (
                  <img src={s.start_image_url} alt="" className="w-20 h-12 object-cover rounded" />
                )}
                <button onClick={() => queue(s)} className="btn text-sm whitespace-nowrap">
                  ⚙ Queue render
                </button>
                <button onClick={() => scenes.remove(s.id)} className="btn-ghost text-sm">
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
        {scenes.items.length === 0 && (
          <div className="card text-center text-neutral-500">No scenes yet — create your first one.</div>
        )}
      </div>
    </div>
  );
}
