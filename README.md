# 🔥 AnimeStudio AI

A **private AI video studio** web app: scene manager, locked character
references, a job queue, and a finished-video library. Video rendering happens
on **free GPU workers you start yourself** — Google Colab, Kaggle, Lightning AI.

**Total cost: $0 — no credit/debit card required anywhere.**

---

## Two phases — read this first

**Phase 1 — NOW: static site on GitHub Pages (this repo).**
GitHub Pages only serves static files (no server, no API routes), so the
studio runs **entirely in your browser**: scenes, characters, jobs and video
metadata live in `localStorage`, finished MP4s in `IndexedDB`. Workers run in
**standalone mode**: you paste a scene prompt into the notebook, download the
MP4, and import it into the Library yourself.

**Phase 2 — LATER (optional): Vercel backend (also free, no card).**
`docs/api-spec.md` specifies the server API (Supabase Postgres + Storage).
Once deployed, the same three workers flip to **server mode**: they poll
`/api/jobs/next`, render, and auto-upload — no manual MP4 moving.

---

## Architecture (Phase 1)

```
┌──────────────────────────────────────────┐
│  GitHub Pages (static, username.github.io│
│  /animestudio-ai)                        │
│  • Dashboard — job queue (localStorage)  │
│  • Scene manager — prompts, styles       │
│  • Characters — locked reference looks   │
│  • Library — finished MP4s (IndexedDB)   │
└──────────────────────────────────────────┘
        ▲  you copy prompts / import MP4s by hand
        │
┌───────┴──────────────────────────────────┐
│  GPU workers — STANDALONE mode           │
│  1. Colab Free (primary) · notebook      │
│  2. Kaggle GPU (backup) · notebook       │
│  3. Lightning AI free (top-up) · script  │
│  paste prompt → LTX-Video 2B → MP4 ↓     │
└──────────────────────────────────────────┘
```

**How a render flows today:**
1. Create a **scene** (title, prompt, style `anime`/`cinematic`, type
   `text-to-video`/`image-to-video`, optional character + start image).
2. Press **⚙ Queue render** → job appears as `queued` on the Dashboard.
3. Press **📋 Copy prompt** → paste it into a worker notebook's Config cell
   (standalone mode) → run → download the MP4 (~10–25 min on a free T4).
4. Back on the Dashboard press **⬆ Attach finished MP4** → the job flips to
   `done` and the video lands in your **Library** (bytes in IndexedDB).

## Quick start (local)

```bash
cd ~/workspace/animestudio-ai
npm install
npm run dev          # → http://localhost:3000
```

Optional: copy `.env.example` to `.env.local` and set
`NEXT_PUBLIC_ANIME_STUDIO_PASSWORD` for the password gate.

## Deploy to GitHub Pages (free)

1. **Create the repo** on GitHub, e.g. `animestudio-ai` (public — see the
   honest limitation below).
2. **Push the code:**
   ```bash
   cd ~/workspace/animestudio-ai
   git init && git add -A && git commit -m "AnimeStudio AI"
   git branch -M main
   git remote add origin https://github.com/<username>/animestudio-ai.git
   git push -u origin main
   ```
3. **Enable Pages:** repo → **Settings → Pages** → *Build and deployment* →
   **Source: GitHub Actions**. (The included workflow does the rest.)
4. **(Optional) password gate:** repo → **Settings → Secrets and variables →
   Actions** → add secret `STUDIO_PASSWORD`. The workflow bakes it into the
   build as `NEXT_PUBLIC_ANIME_STUDIO_PASSWORD`.
5. Push to `main` → the workflow builds the static export and deploys.
   Your site: **`https://<username>.github.io/animestudio-ai/`**

The workflow sets `NEXT_BASE_PATH=/<repo-name>` automatically from the repo
name, so links and assets resolve under the project sub-path.

## The three GPU workers

| # | Worker | Role | Real limit |
|---|---|---|---|
| 1 | **Google Colab Free** | Primary | Sessions disconnect (idle timeouts, usage throttles); not always-on |
| 2 | **Kaggle GPU** | Backup | ~30 free GPU hours/week quota |
| 3 | **Lightning AI** (free tier) | Top-up | **5 free signup credits** (one-time, expire after 12 mo) — then paywalled; Studio **restarts every 4h**; phone verification at signup |

All three run the **same LTX-Video 2B** model (fits a free T4) and support
**both modes**: standalone today (paste prompt → MP4), server polling later.
Guides: `workers/colab-worker.ipynb`, `workers/kaggle-worker.ipynb`,
`workers/lightning-worker.md` (+ `workers/lightning-worker.py`).

No Modal anywhere in this project — it requires a card on file, which violates
the $0/no-card rule.

---

## ⚠️ Honest limitations

- **GitHub Pages (free) = public repo = public site.** The password gate is
  baked into the JS bundle — it keeps casual visitors out but anyone can read
  the source. Do not treat the Pages deployment as truly private. Real
  server-side auth comes with the Phase-2 Vercel backend.
- **Your data lives in the browser** (`localStorage` for scenes/jobs/metadata,
  `IndexedDB` for MP4s). It's per-device and disappears if browser data is
  cleared. Export important MP4s to your own storage.
- **No automatic queue yet.** Until the Vercel backend exists, moving prompts
  and MP4s between the site and workers is manual (copy prompt → run notebook
  → download MP4 → attach/import).
- **Speed:** a free T4 renders one ~5 s 512×768 clip in ~10–25 min.
- **Style is prompt-driven:** "anime"/"cinematic" is a prompt suffix on the
  general LTX-Video 2B model, not a dedicated anime checkpoint.
- **TeraBox:** investigated — no official public API (only fragile
  cookie/jsToken community tools). Use it as a **manual backup** (download from
  Library → upload via TeraBox site/app), not automation.

## Phase 2 — Vercel backend (later, still free)

1. `npm i @supabase/supabase-js`, create a free Supabase project, run
   `supabase-schema.sql`.
2. Implement the routes in `docs/api-spec.md` (dashboard CRUD + worker
   protocol: `/api/jobs/next`, `/complete`, `/fail`).
3. Deploy to Vercel (free, no card), set `ANIME_STUDIO_PASSWORD` +
   `WORKER_TOKEN`, point workers at the URL, flip notebooks to server mode.

## Project layout

```
animestudio-ai/
├── app/                    # Next.js App Router (static export)
│   ├── dashboard/          # job queue (localStorage, attach-MP4 flow)
│   ├── scenes/             # scene manager + queue buttons
│   ├── characters/         # character reference cards
│   ├── library/            # finished videos, IndexedDB playback
│   └── login/              # client-side password gate
├── components/             # JobList, SceneManager, CharacterManager, AuthGuard…
├── lib/
│   ├── store.ts            # localStorage collections + file helpers
│   ├── idb.ts              # IndexedDB blob store (MP4s)
│   ├── auth-client.ts      # static password gate (obscurity, not security)
│   └── types.ts
├── workers/
│   ├── colab-worker.ipynb      # standalone-first + server mode
│   ├── kaggle-worker.ipynb     # standalone-first + server mode
│   ├── lightning-worker.py     # --prompt mode + server poll mode
│   └── lightning-worker.md     # Lightning AI setup guide
├── docs/
│   └── api-spec.md         # FUTURE server API (Vercel phase) — docs only
├── supabase-schema.sql     # for the future backend
├── .github/workflows/deploy.yml  # Pages: build + export + deploy on push
├── .env.example
└── README.md
```
