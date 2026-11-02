# AnimeStudio AI — Server API Specification (future Vercel backend)

> **Status: documentation only.** The GitHub Pages build is fully static and
> ships **no** API routes. This spec describes the backend to implement when the
> studio is later deployed to **Vercel (free tier, no card required)** so the
> Colab / Kaggle / Lightning workers can switch from standalone mode to
> queue-polling mode without changing their protocol.
>
> Reference implementation needs: `npm i @supabase/supabase-js`, plus
> `supabase-schema.sql` applied in the Supabase SQL editor.

## Auth

| Surface | Mechanism |
|---|---|
| Dashboard pages + dashboard CRUD routes | Cookie session. `POST /api/login {password}` compares against `ANIME_STUDIO_PASSWORD` and sets an `HttpOnly` cookie. Middleware gates everything except public paths. |
| Worker endpoints (`/next`, `/complete`, `/fail`) | `Authorization: Bearer <WORKER_TOKEN>` header, compared against `WORKER_TOKEN` env var. |

## Endpoints

### POST /api/login
Body: `{ "password": string }` → `200 { ok: true }` + cookie, or `401`.

### POST /api/logout
Clears the cookie → `200 { ok: true }`.

### GET /api/jobs[?status=queued|running|done|failed]
`200 { jobs: Job[] }` — newest first, limit 200.

### POST /api/jobs
Body: `{ "scene_id": string }` **or** `{ "prompt", "style", "type" }`
(`style`: `anime` | `cinematic`; `type`: `text-to-video` | `image-to-video`).
With `scene_id`, prompt/style/type are copied from the scene row.
→ `201 { job: Job }`.

### GET /api/jobs/next?worker=colab
**Worker polling endpoint** (Bearer auth).
1. Select oldest `jobs` row with `status = 'queued'` ordered by `created_at`.
2. Empty → `204 No Content`.
3. Claim: `UPDATE jobs SET status='running', worker=?, updated_at=now()
   WHERE id=? AND status='queued'`. If no row updated (race lost) → `204`.
4. Resolve continuity: via `scene_id` → scene's `start_image_url`;
   via scene's `character_id` → character's `reference_image_url`.
5. Increment `attempts`.
6. → `200 { job: WorkerJobPayload }`:

```jsonc
{
  "job": {
    "id": "uuid",
    "prompt": "…",
    "style": "cinematic",          // "anime" | "cinematic"
    "type": "image-to-video",      // "text-to-video" | "image-to-video"
    "character_reference_url": "https://…",  // nullable
    "start_image_url": "https://…"           // nullable
  }
}
```

### POST /api/jobs/[id]/complete
**Worker result upload** (Bearer auth). Body: `multipart/form-data` with
`video` (mp4, required) and optional `thumbnail` (image).
Server: upload to Supabase Storage buckets `videos/` and `thumbnails/`,
`UPDATE jobs SET status='done', video_url=?, thumbnail_url=?`,
`INSERT INTO videos (job_id, scene_id, title, video_url, thumbnail_url)`.
→ `200 { ok: true, video_url, thumbnail_url }`.

### POST /api/jobs/[id]/fail
**Worker failure report** (Bearer auth). Body: `{ "error": string }`.
→ `UPDATE jobs SET status='failed', error=?` → `200 { ok: true }`.

### GET /api/scenes · POST /api/scenes
List (with `characters(name)` join) / create
`{ title, prompt, style, type, character_id?, start_image_url? }`.

### GET /api/characters · POST /api/characters
List / create `{ name, look_description, reference_image_url? }`.

### POST /api/uploads
`multipart/form-data { bucket: "reference-images"|"thumbnails", file }`
→ `201 { url }` (public Supabase Storage URL).

## Data model

See `supabase-schema.sql`: tables `characters`, `scenes`, `jobs`, `videos`;
storage buckets `videos`, `thumbnails`, `reference-images` (public read;
writes via service-role key server-side).

## Worker protocol summary (implemented by all three workers)

```
loop:
  GET /api/jobs/next?worker=<name>   → 204 (sleep 60s) | 200 {job}
  render with LTX-Video 2B (text or image-to-video per job.type)
  POST /api/jobs/<id>/complete  (multipart video)
  on exception: POST /api/jobs/<id>/fail {"error": "..."}
```
