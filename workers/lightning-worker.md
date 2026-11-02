# ⚡ AnimeStudio AI — Lightning AI GPU Worker (Worker 3)

This guide turns a **free Lightning AI Studio** into a third render worker for
your AnimeStudio AI studio. It works in the **same two modes** as the Colab and
Kaggle workers:

- **(a) Standalone (works TODAY):** render one prompt → download the MP4 →
  import it into the studio's **Library** page yourself.
- **(b) Server queue (later, after the Vercel backend from `docs/api-spec.md`
  exists):** poll `/api/jobs/next`, auto-upload results.

**Cost: $0. No credit/debit card required** — Lightning AI's free tier needs
only an email/Google/GitHub signup plus phone verification (anti-abuse).

## Real limits (read before relying on it)

- **5 free credits on signup** (1 credit = $1). 25 more are offered only if you
  add a card — **we don't**; this setup stays on the 5 free credits.
- The 5 credits are a **one-time grant**, not a monthly refill, and expire
  after 12 months. **When they run out, GPU compute is paywalled** — plan
  Lightning as a top-up worker, not the primary.
- The **free Studio restarts every 4 hours**. Your files persist, but you must
  re-run the worker script after each restart. Queued jobs wait safely on the
  website in the meantime.
- GPU menu includes T4 (cheapest — best value for the 5 credits), L4, A100, H200.

## Setup — step by step

### 1. Create a Lightning AI account (no card)
1. Go to **lightning.ai** → Sign up with email, Google, or GitHub.
2. **Verify your phone number** when asked — this unlocks the free credits.
   No credit card is requested at any point of the free signup.

### 2. Create a Studio
1. Dashboard → **Create Studio** (or "New Studio").
2. Name it e.g. `animestudio-worker`.
3. **Compute → GPU → T4** (stretch the 5 free credits; a T4 fits LTX-Video 2B).
4. Leave disk at the default; Start the Studio and wait for it to be ready.

### 3. Get the worker script into the Studio
Option A — upload: in the Studio file browser, upload
`workers/lightning-worker.py` from this project.

Option B — terminal: open the Studio terminal and paste:
```bash
# (paste your own URL — or scp the file in; there is no public repo to curl from yet)
cat > lightning-worker.py << 'EOF'
# …paste the contents of workers/lightning-worker.py…
EOF
```

### 4. Install dependencies (once per Studio)
In the Studio terminal:
```bash
pip install -q diffusers transformers accelerate safetensors imageio imageio-ffmpeg requests Pillow
```
First model load also downloads ~8 GB of weights — it caches on the Studio's
persistent disk, so later restarts are fast.

### 5. Render — Mode A: standalone (today)

Copy a scene prompt from the studio's **Scenes** page, then in the Studio terminal:

```bash
# text-to-video
python lightning-worker.py --prompt "Slow aerial drift over a smouldering crater at night, embers rising" --style cinematic

# image-to-video (upload start.png to the Studio first)
python lightning-worker.py --prompt "…" --type image-to-video --image start.png --out crater.mp4
```

When it finishes, download the MP4 from the Studio file browser and import it
into the studio's **Library** page (or attach it to the job on the Dashboard).

### 6. Render — Mode B: server queue (after the Vercel backend exists)

```bash
export ANIMESTUDIO_URL="https://your-app.vercel.app"   # your deployed site, no trailing slash
export ANIMESTUDIO_WORKER_TOKEN="your-worker-token"    # same WORKER_TOKEN as in the backend .env
python lightning-worker.py
```

You should see:
```
Model ready ✅
Worker 'lightning' polling https://your-app.vercel.app every 60s …
```

Queue a scene from the website → the worker picks it up within a minute →
renders (~10–25 min for a ~5 s clip on T4) → uploads the MP4 → the **Dashboard**
flips it to `done` and it appears in the **Library**.

### 7. After a 4-hour restart
The Studio stops; files remain. Just re-open the Studio and re-run the same
command from step 5 or 6. No reinstall needed (deps and model weights persist
on disk).

## How it fits with the other workers

| Worker | Role | Real limit |
|---|---|---|
| 1. Google Colab Free | Primary | Sessions disconnect (idle timeouts, usage throttles); not always-on |
| 2. Kaggle GPU | Backup | ~30 free GPU hours/week quota |
| 3. Lightning AI | Top-up / third | 5 free signup credits (one-time, 12-mo expiry), then paywalled; Studio restarts every 4h |

All three workers support both modes. In **standalone mode** (today) each one
renders a pasted prompt and you move the MP4 yourself; in **server mode**
(later) they all poll the same `/api/jobs/next` endpoint, the backend hands
each job to exactly one worker, and queued jobs simply wait when every worker
is offline.
