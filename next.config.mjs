/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for GitHub Pages (no server, no API routes).
  output: "export",
  // Project Pages live under /<repo-name>. Set NEXT_BASE_PATH=/<repo-name>
  // when building for Pages (the deploy workflow does this). Leave empty
  // for local dev.
  basePath: process.env.NEXT_BASE_PATH || "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
