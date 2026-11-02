"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Episode, Project, ProjectScene } from "@/lib/types";
import { KEYS, useCollection } from "@/lib/store";
import { seedSeriesProjects } from "@/lib/seed";

function ProjectCard({ project }: { project: Project }) {
  const episodes = useCollection<Episode>(KEYS.episodes);
  const scenes = useCollection<ProjectScene>(KEYS.projectScenes);

  const epCount = episodes.items.filter((e) => e.projectId === project.id).length;
  const epIds = new Set(
    episodes.items.filter((e) => e.projectId === project.id).map((e) => e.id)
  );
  const projScenes = scenes.items.filter((s) => epIds.has(s.episodeId));
  const done = projScenes.filter((s) => s.status === "done").length;
  const pct = projScenes.length ? Math.round((done / projScenes.length) * 100) : 0;

  return (
    <Link href={`/projects/${project.id}/`} className="card hover:border-accent transition block">
      <h2 className="text-xl font-bold">{project.name}</h2>
      <p className="text-xs text-accent mt-1">{project.style}</p>
      <p className="text-sm text-neutral-400 mt-2 line-clamp-3">{project.description}</p>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-neutral-500 mb-1">
          <span>
            {epCount} episodes · {done}/{projScenes.length} scenes done
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-ink overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}

function ProjectsInner() {
  const projects = useCollection<Project>(KEYS.projects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");

  function createProject() {
    if (!name.trim()) return;
    projects.add({
      name: name.trim(),
      description: description.trim(),
      style: style.trim() || "Cinematic photorealistic",
    });
    setName("");
    setDescription("");
    setStyle("");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">🎬 Series Projects</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Google Flow-style production tracking — each project holds its episodes and scenes,
        ready to queue into the render pipeline.
      </p>

      <div className="card mb-6">
        <h2 className="font-bold mb-3">+ New Project</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label>Project name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aakhri Angara"
            />
          </div>
          <div>
            <label>Style</label>
            <input
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="e.g. Cinematic photorealistic (Mythra Films style)"
            />
          </div>
        </div>
        <div className="mt-3">
          <label>Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this series about?"
          />
        </div>
        <button onClick={createProject} disabled={!name.trim()} className="btn mt-3">
          Create project
        </button>
      </div>

      {projects.items.length === 0 ? (
        <div className="card text-center text-neutral-500">
          No projects yet — create your first one above.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {projects.items.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedSeriesProjects();
    setReady(true);
  }, []);

  if (!ready) return <div className="card text-neutral-500">Loading projects…</div>;
  return <ProjectsInner />;
}
