"use client";

import { useEffect, useState } from "react";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * useCollection — a JSON document in localStorage with React state.
 * Used for characters, scenes, jobs and video metadata. Works fully offline.
 */
export function useCollection<T extends { id: string }>(key: string) {
  const [items, setItems] = useState<T[]>(() => read<T[]>(key, []));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {
      // Quota exceeded (large data-URL images) — keep in-memory copy.
      console.warn("localStorage write failed:", e);
    }
  }, [key, items]);

  const add = (input: Omit<T, "id" | "created_at"> & { id?: string; created_at?: string }): T => {
    const full = {
      ...input,
      id: (input as { id?: string }).id ?? crypto.randomUUID(),
      created_at: (input as { created_at?: string }).created_at ?? new Date().toISOString(),
    } as unknown as T;
    setItems((prev) => [full, ...prev]);
    return full;
  };

  const update = (id: string, patch: Partial<T>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  return { items, add, update, remove };
}

export const KEYS = {
  characters: "as_characters",
  scenes: "as_scenes",
  jobs: "as_jobs",
  videos: "as_videos",
} as const;

/** Read an image <input> file as a data-URL for localStorage storage. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("could not read file"));
    r.readAsDataURL(file);
  });
}
