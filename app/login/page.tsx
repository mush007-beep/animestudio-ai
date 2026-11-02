"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkPassword, gateEnabled, setAuthed } from "@/lib/auth-client";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!gateEnabled()) router.replace("/dashboard");
  }, [router]);

  if (!gateEnabled()) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (checkPassword(password)) {
      setAuthed();
      router.push("/dashboard");
    } else {
      setError("Wrong password.");
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">
          <span className="text-ember">🔥</span> AnimeStudio AI
        </h1>
        <p className="text-sm text-neutral-500 text-center">
          Studio password required.
          <br />
          <span className="text-xs">
            (Static-site gate — keeps casual visitors out, not real security.)
          </span>
        </p>
        <div>
          <label htmlFor="pw">Password</label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            placeholder="Studio password"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="btn w-full" disabled={!password}>
          Unlock studio
        </button>
      </form>
    </div>
  );
}
