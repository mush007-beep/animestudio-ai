import ProjectDetailClient from "./ProjectDetailClient";

/**
 * Static export (GitHub Pages) needs generateStaticParams for dynamic routes.
 * The page is fully client-rendered from localStorage; this param only
 * satisfies the build. Direct visits to other project ids 404 on Pages
 * (static host), so always navigate here through the in-app links.
 */
export function generateStaticParams() {
  return [{ id: "aakhri-angara" }];
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  return <ProjectDetailClient projectId={params.id} />;
}
