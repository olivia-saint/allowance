#!/usr/bin/env python3
"""Assemble the Allowance demo video.

Takes the per-beat browser clips from shots/beats/, generates a voiceover for each beat
with ElevenLabs, pads each clip to fit its narration, and concatenates everything into
submission/demo.mp4 (1920x1080, H.264 + AAC).

    python3 submission/assemble.py
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BEATS = ROOT / "shots" / "beats"
WORK = ROOT / "shots" / "video-work"
OUT = ROOT / "submission" / "demo.mp4"
TAIL = 0.9  # seconds of silence after each narration before the next beat
BASE_URL = os.environ.get("BASE_URL", "https://allowance.olivia.saint.work")


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


def duration(path: Path) -> float:
    out = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", str(path),
    ]).stdout.strip()
    return float(out)


def narrate(text: str, out: Path) -> None:
    env = {}
    envfile = Path("/workspace/.env")
    if envfile.exists():
        for line in envfile.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    voice = env.get("SAINT_NOTE_VOICE") or os.environ.get("SAINT_NOTE_VOICE")
    if not voice:
        sys.exit("sag: SAINT_NOTE_VOICE is not set")
    run(["sag", "-v", voice, "-o", str(out), text], env={**os.environ, **env})


def main() -> None:
    manifest = json.loads((BEATS / "beats.json").read_text())
    WORK.mkdir(parents=True, exist_ok=True)
    segments: list[Path] = []

    for i, beat in enumerate(manifest, start=1):
        video = Path(beat["video"])
        if not video.exists():
            print(f"skip {beat['id']}: no clip")
            continue
        audio = WORK / f"{beat['id']}.mp3"
        if not audio.exists():
            print(f"narrating {beat['id']}…")
            narrate(beat["narration"], audio)
        adur = duration(audio)
        vdur = duration(video)
        total = max(vdur, adur + TAIL)
        seg = WORK / f"{i:02d}-{beat['id']}.mp4"
        # Freeze the last frame if the clip is shorter than the narration; otherwise keep rolling.
        pad = max(0.0, total - vdur)
        vf = (
            f"scale=1920:1080:force_original_aspect_ratio=decrease,"
            f"pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0f172a,fps=30,"
            f"tpad=stop_mode=clone:stop_duration={pad:.2f},trim=duration={total:.2f},setpts=PTS-STARTPTS"
        )
        af = f"apad,atrim=duration={total:.2f},asetpts=PTS-STARTPTS"
        run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(video), "-i", str(audio),
            "-filter_complex", f"[0:v]{vf}[v];[1:a]{af}[a]",
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2",
            str(seg),
        ])
        segments.append(seg)
        print(f"  {beat['id']}: video {vdur:.1f}s + narration {adur:.1f}s → {total:.1f}s")

    if not segments:
        sys.exit("nothing to assemble")

    (WORK / "list.txt").write_text("".join(f"file '{s}'\n" for s in segments))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(WORK / "list.txt"), "-c", "copy", str(OUT)])
    name = f"allowance-demo-{duration(OUT):.0f}s"
    print(f"\nwrote {OUT} ({duration(OUT):.1f}s)")
    print(f"next: cp {OUT} {ROOT}/public/allowance/{name}.mp4")


if __name__ == "__main__":
    main()
