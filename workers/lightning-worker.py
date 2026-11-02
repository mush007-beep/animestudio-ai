#!/usr/bin/env python3
"""
AnimeStudio AI — Lightning AI GPU worker (Worker 3).

TWO MODES (same as the Colab/Kaggle notebooks):

  (a) STANDALONE (works today, default when --prompt is given):
        python lightning-worker.py --prompt "…" --style cinematic --type text-to-video
        python lightning-worker.py --prompt "…" --type image-to-video --image start.png
      Renders one clip and saves output.mp4 locally. Import it into the
      studio's Library page yourself.

  (b) SERVER (later, after the Vercel backend from docs/api-spec.md exists):
        export ANIMESTUDIO_URL="https://your-app.vercel.app"
        export ANIMESTUDIO_WORKER_TOKEN="your-worker-token"
        python lightning-worker.py
      Polls GET /api/jobs/next, renders, POSTs the MP4 to /api/jobs/<id>/complete
      (or reports to /api/jobs/<id>/fail).

No credit card is required for Lightning AI's free tier (5 signup credits,
phone verification at signup). The free Studio restarts every 4 hours —
just re-run this script after a restart; queued jobs wait safely.
"""

import argparse
import io
import os
import sys
import time

import requests
from PIL import Image

# ---------------------------------------------------------------- config
WORKER_NAME = os.environ.get("WORKER_NAME", "lightning")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "60"))
MODEL_ID = "Lightricks/LTX-Video"  # 2B params — fits a T4 with CPU offload

# Server-mode config comes from env (only needed without --prompt).
WEBSITE_URL = os.environ.get("ANIMESTUDIO_URL", "").rstrip("/")
WORKER_TOKEN = os.environ.get("ANIMESTUDIO_WORKER_TOKEN", "")
HEADERS = {"Authorization": f"Bearer {WORKER_TOKEN}"}

parser = argparse.ArgumentParser(description="AnimeStudio AI worker (standalone or server mode)")
parser.add_argument("--prompt", help="Standalone mode: render this prompt once and exit")
parser.add_argument("--style", default="cinematic", choices=["cinematic", "anime"])
parser.add_argument("--type", default="text-to-video", dest="job_type",
                    choices=["text-to-video", "image-to-video"])
parser.add_argument("--image", help="Start-frame image for --type image-to-video")
parser.add_argument("--out", default="output.mp4", help="Output MP4 path (standalone mode)")
args = parser.parse_args()

STANDALONE = bool(args.prompt)
if not STANDALONE and (not WEBSITE_URL or not WORKER_TOKEN):
    sys.exit(
        "Server mode needs ANIMESTUDIO_URL and ANIMESTUDIO_WORKER_TOKEN env vars.\n"
        "For standalone mode pass --prompt \"…\" instead.\n"
        "See workers/lightning-worker.md for the setup guide."
    )

# ---------------------------------------------------------------- model
print("Loading LTX-Video … (first run downloads ~8 GB, then it's cached)")
import torch  # noqa: E402
from diffusers import LTXPipeline, LTXImageToVideoPipeline  # noqa: E402
from diffusers.utils import export_to_video  # noqa: E402

DTYPE = torch.bfloat16
t2v = LTXPipeline.from_pretrained(MODEL_ID, torch_dtype=DTYPE)
t2v.enable_model_cpu_offload()
i2v = LTXImageToVideoPipeline.from_pretrained(MODEL_ID, torch_dtype=DTYPE)
i2v.enable_model_cpu_offload()
print("Model ready ✅")


# ---------------------------------------------------------------- helpers
def poll_next():
    """Return the oldest queued job, or None when the queue is empty."""
    r = requests.get(
        f"{WEBSITE_URL}/api/jobs/next",
        params={"worker": WORKER_NAME},
        headers=HEADERS,
        timeout=30,
    )
    if r.status_code == 204:
        return None
    r.raise_for_status()
    return r.json()["job"]


def style_suffix(style: str) -> str:
    return (
        "japanese anime style, vibrant cel shading, clean line art"
        if style == "anime"
        else "photorealistic cinematic film still, natural lighting"
    )


def generate(job, start_image_path: str | None = None, out: str = "/tmp/output.mp4") -> str:
    prompt = job["prompt"] + ", " + style_suffix(job.get("style", "cinematic"))
    print("Prompt:", prompt[:160], "…")

    start_image_url = job.get("start_image_url")
    if job["type"] == "image-to-video" and (start_image_path or start_image_url):
        if start_image_path:
            print("Using local start frame:", start_image_path)
            img = Image.open(start_image_path).convert("RGB").resize((768, 512))
        else:
            print("Downloading start frame …")
            img_bytes = requests.get(start_image_url, timeout=60).content
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB").resize((768, 512))
        frames = i2v(
            prompt=prompt,
            image=img,
            num_frames=121,  # ~5s at 24fps
            num_inference_steps=30,
            guidance_scale=3.0,
        ).frames[0]
    else:
        frames = t2v(
            prompt=prompt,
            height=512,
            width=768,
            num_frames=121,
            num_inference_steps=30,
            guidance_scale=3.0,
        ).frames[0]

    export_to_video(frames, out, fps=24)
    return out


def report_complete(job_id: str, path: str) -> None:
    with open(path, "rb") as f:
        files = {"video": ("output.mp4", f, "video/mp4")}
        r = requests.post(
            f"{WEBSITE_URL}/api/jobs/{job_id}/complete",
            headers=HEADERS,
            files=files,
            timeout=600,
        )
    r.raise_for_status()


def report_fail(job_id: str, err: Exception) -> None:
    try:
        requests.post(
            f"{WEBSITE_URL}/api/jobs/{job_id}/fail",
            headers={**HEADERS, "Content-Type": "application/json"},
            json={"error": str(err)[:500]},
            timeout=30,
        )
    except Exception as e2:
        print("Could not report failure:", e2)


# ---------------------------------------------------------------- main
def main() -> None:
    if STANDALONE:
        start = args.image  # path or None; generate() opens it
        path = generate(
            {"prompt": args.prompt, "style": args.style, "type": args.job_type,
             "start_image_url": None},
            start_image_path=start,
            out=args.out,
        )
        print(f"⬇ Saved {path} — import it into the studio's Library page ✅")
        return

    print(f"Worker '{WORKER_NAME}' polling {WEBSITE_URL} every {POLL_INTERVAL}s …")
    print("Keep the Studio running. Ctrl+C (or stop the Studio) to shut down.")
    while True:
        try:
            job = poll_next()
        except Exception as e:  # network blip — keep polling
            print("poll error:", e)
            time.sleep(POLL_INTERVAL)
            continue

        if not job:
            print(".", end="", flush=True)
            time.sleep(POLL_INTERVAL)
            continue

        print(f"\n🎬 Got job {job['id'][:8]} ({job['type']}, {job['style']}) — generating…")
        try:
            path = generate(job)
            report_complete(job["id"], path)
            print("✅ done, reported complete")
        except Exception as e:
            print("❌ generation failed:", e)
            report_fail(job["id"], e)
        time.sleep(5)


if __name__ == "__main__":
    main()
