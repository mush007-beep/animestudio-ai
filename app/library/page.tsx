"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoEntry } from "@/lib/types";
import { KEYS, useCollection } from "@/lib/store";
import { idbDel, idbGet, idbSet, videoBlobKey } from "@/lib/idb";
import { timeAgo } from "@/components/ui";

function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function VideoCard({
  video,
  onDelete,
}: {
  video: VideoEntry;
  onDelete: (v: VideoEntry) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    let objUrl = "";
    idbGet(videoBlobKey(video.id)).then((blob) => {
      if (!alive) return;
      if (blob) {
        objUrl = URL.createObjectURL(blob);
        setUrl(objUrl);
      } else {
        setMissing(true);
      }
    });
    return () => {
      alive = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [video.id]);

  return (
    <div className="card p-3">
      {url ? (
        <video controls preload="metadata" src={url} className="w-full rounded-lg bg-black aspect-video" />
      ) : (
        <div className="w-full aspect-video rounded-lg bg-ink border border-line flex items-center justify-center text-sm text-neutral-500">
          {missing ? "⚠️ video file not found in this browser" : "Loading…"}
        </div>
      )}
      <h3 className="font-semibold mt-2 truncate">{video.title}</h3>
      <p className="text-xs text-neutral-500">
        {formatMB(video.size)} · {timeAgo(video.created_at)}
      </p>
      <div className="flex gap-2 mt-2">
        {url && (
          <a href={url} download={`${video.title.replace(/[^\w\-]+/g, "_")}.mp4`} className="btn-ghost text-xs flex-1">
            ⬇ Download
          </a>
        )}
        <button onClick={() => onDelete(video)} className="btn-ghost text-xs">
          ✕ Delete
        </button>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const videos = useCollection<VideoEntry>(KEYS.videos);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const entry: VideoEntry = {
      id: crypto.randomUUID(),
      title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
      job_id: null,
      size: file.size,
      created_at: new Date().toISOString(),
    };
    await idbSet(videoBlobKey(entry.id), file);
    videos.add(entry);
    setTitle("");
  }

  async function onDelete(v: VideoEntry) {
    await idbDel(videoBlobKey(v.id));
    videos.remove(v.id);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Library</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Finished videos live in this browser (IndexedDB) — import the MP4s you
        download from a worker notebook.
      </p>

      <div className="card mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label>Title for the imported video</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ember crater — final"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/*"
          className="hidden"
          onChange={onImport}
        />
        <button onClick={() => fileRef.current?.click()} className="btn">
          ⬆ Import MP4
        </button>
      </div>

      {videos.items.length === 0 && (
        <div className="card text-center text-neutral-500">
          No videos yet. Render a scene in a worker notebook, download the MP4,
          and import it here.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.items.map((v) => (
          <VideoCard key={v.id} video={v} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
