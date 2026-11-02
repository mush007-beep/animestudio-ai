import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "AnimeStudio AI",
  description: "Private AI video studio — scenes, characters, GPU job queue, library",
};

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/create", label: "+ Create" },
  { href: "/projects", label: "Projects" },
  { href: "/workers", label: "Workers" },
  { href: "/scenes", label: "Scenes" },
  { href: "/characters", label: "Characters" },
  { href: "/library", label: "Library" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthGuard>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-line bg-panel/60 backdrop-blur sticky top-0 z-10">
              <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                <Link href="/dashboard" className="text-xl font-bold">
                  <span className="text-ember">🔥</span> AnimeStudio{" "}
                  <span className="text-accent">AI</span>
                </Link>
                <nav className="flex gap-1">
                  {NAV.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className="px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-panel hover:text-white"
                    >
                      {n.label}
                    </Link>
                  ))}
                </nav>
                <LogoutButton />
              </div>
            </header>
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
            <footer className="border-t border-line py-4 text-center text-xs text-neutral-600">
              AnimeStudio AI — local static studio. Workers: Colab · Kaggle · Lightning AI.
            </footer>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
