"use client";

import { useState } from "react";
import type { Character } from "@/lib/types";
import { KEYS, fileToDataUrl, useCollection } from "@/lib/store";
import { timeAgo } from "./ui";

export default function CharacterManager() {
  const chars = useCollection<Character>(KEYS.characters);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", look_description: "", reference_image_url: "" });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setForm((f) => ({ ...f, reference_image_url: url }));
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    chars.add({
      name: form.name,
      look_description: form.look_description,
      reference_image_url: form.reference_image_url || null,
    });
    setForm({ name: "", look_description: "", reference_image_url: "" });
    setBusy(false);
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <form onSubmit={create} className="card lg:col-span-2 space-y-3 h-fit">
        <h2 className="text-lg font-bold">New character</h2>
        <div>
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Zara" required />
        </div>
        <div>
          <label>Look description (locked — copy into worker prompts)</label>
          <textarea
            rows={5}
            value={form.look_description}
            onChange={(e) => setForm({ ...form, look_description: e.target.value })}
            placeholder="19, deep brown eyes, long black braid, faint ash mark on forehead, worn brown leather apron over indigo kurti…"
            required
          />
        </div>
        <div>
          <label>Reference image</label>
          <input type="file" accept="image/*" onChange={onFile} />
          {form.reference_image_url && (
            <img src={form.reference_image_url} alt="reference" className="mt-2 rounded-lg max-h-32" />
          )}
        </div>
        <button type="submit" className="btn w-full" disabled={busy}>
          {busy ? "Saving…" : "Save character"}
        </button>
      </form>

      <div className="lg:col-span-3">
        <h2 className="text-lg font-bold mb-3">Characters ({chars.items.length})</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {chars.items.map((c) => (
            <div key={c.id} className="card">
              {c.reference_image_url ? (
                <img src={c.reference_image_url} alt={c.name} className="w-full h-44 object-cover rounded-lg mb-3" />
              ) : (
                <div className="w-full h-44 rounded-lg mb-3 bg-ink border border-line flex items-center justify-center text-4xl">
                  👤
                </div>
              )}
              <h3 className="font-bold text-lg">{c.name}</h3>
              <p className="text-sm text-neutral-400 mt-1 whitespace-pre-wrap">{c.look_description}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-neutral-600">{timeAgo(c.created_at)}</p>
                <button onClick={() => chars.remove(c.id)} className="btn-ghost text-xs">✕ Delete</button>
              </div>
            </div>
          ))}
          {chars.items.length === 0 && (
            <div className="card text-center text-neutral-500 col-span-2">
              No characters yet — lock your first look above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
