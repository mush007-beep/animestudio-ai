import type { JobStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: JobStatus }) {
  const styles: Record<JobStatus, string> = {
    queued: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    running: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    done: "bg-green-500/15 text-green-300 border-green-500/30",
    failed: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}
    >
      {status.toUpperCase()}
    </span>
  );
}

export function StyleTag({ style }: { style: string }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30">
      {style === "anime" ? "🎌 anime" : "🎬 cinematic"}
    </span>
  );
}

export function TypeTag({ type }: { type: string }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs bg-neutral-700/40 text-neutral-300 border border-line">
      {type === "image-to-video" ? "🖼→🎞 image-to-video" : "✏️→🎞 text-to-video"}
    </span>
  );
}

export function SetupNotice() {
  return (
    <div className="card border-ember/40">
      <h2 className="text-lg font-bold text-ember mb-2">⚠️ Supabase not configured</h2>
      <p className="text-sm text-neutral-400">
        Copy <code className="text-neutral-200">.env.example</code> to{" "}
        <code className="text-neutral-200">.env.local</code>, fill in your Supabase URL and keys,
        run <code className="text-neutral-200">supabase-schema.sql</code> in the Supabase SQL
        editor, then restart the dev server.
      </p>
    </div>
  );
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
