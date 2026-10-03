#!/usr/bin/env python3
"""Generate the fixed character lines used by Moonlight English.

With no arguments, macOS uses the built-in ``say`` command. The optional
Kokoro path remains available when its unpublished model inputs are present.

Usage:
  python3 scripts/generate-game-audio.py
  python3 scripts/generate-game-audio.py --backend macos
  python3 scripts/generate-game-audio.py --backend kokoro MODEL.onnx voices-v1.0.bin
"""

from pathlib import Path
import argparse
import shutil
import subprocess
import sys
import tempfile


LINES = [
    {
        "name": "mabel-ribbon",
        "text": "A ribbon? Lots of people have ribbons. Now... would you like more tea?",
        "voice": "bf_emma",
        "language": "en-gb",
        "speed": 0.97,
        "macos_role": "mabel",
        "macos_rate": 158,
    },
    {
        "name": "mabel-confesses",
        "text": "Fine... I planned the tasting. The cat planned the drama.",
        "voice": "bf_emma",
        "language": "en-gb",
        "speed": 0.98,
        "macos_role": "mabel",
        "macos_rate": 162,
    },
    {
        "name": "mabel-small-print",
        "text": "Read the small print. Preferably before the cat... eats it.",
        "voice": "bf_emma",
        "language": "en-gb",
        "speed": 1.0,
        "macos_role": "mabel",
        "macos_rate": 160,
    },
    {
        "name": "mabel-not-kidnapper",
        "text": "My name proves I'm the host! What makes me a kidnapper?",
        "voice": "bf_emma",
        "language": "en-gb",
        "speed": 0.98,
        "macos_role": "mabel",
        "macos_rate": 164,
    },
    {
        "name": "mabel-clarifies",
        "text": "The ribbon, dear... What would you like to ask me about it?",
        "voice": "bf_emma",
        "language": "en-gb",
        "speed": 0.98,
        "macos_role": "mabel",
        "macos_rate": 158,
    },
    {
        "name": "pip-denial",
        "text": "I didn't sing last night!",
        "voice": "am_puck",
        "language": "en-us",
        "speed": 1.04,
        "macos_role": "pip",
        "macos_rate": 212,
    },
    {
        "name": "pip-rehearsal",
        "text": "That was a rehearsal! A very public rehearsal.",
        "voice": "am_puck",
        "language": "en-us",
        "speed": 1.03,
        "macos_role": "pip",
        "macos_rate": 206,
    },
    {
        "name": "reference-question",
        "text": "Then... why is your name on this?",
        "voice": "af_heart",
        "language": "en-us",
        "speed": 0.98,
        "macos_role": "reference",
        "macos_rate": 172,
    },
]


def encode_mp3(ffmpeg, source, target):
    subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-af",
            "adelay=100,apad=pad_dur=0.18,loudnorm=I=-18:TP=-2:LRA=9",
            "-ar",
            "24000",
            "-ac",
            "1",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "96k",
            str(target),
        ],
        check=True,
    )


def generate_with_macos(args, output):
    say = shutil.which(args.say)
    if not say:
        raise RuntimeError(f"macOS speech command not found: {args.say}")

    voices = {
        "mabel": args.mabel_voice,
        "pip": args.pip_voice,
        "reference": args.reference_voice,
    }
    with tempfile.TemporaryDirectory(prefix="moonlight-audio-") as temporary:
        wave = Path(temporary) / "line.aiff"
        for line in LINES:
            subprocess.run(
                [
                    say,
                    "-v",
                    voices[line["macos_role"]],
                    "-r",
                    str(line["macos_rate"]),
                    "-o",
                    str(wave),
                    line["text"],
                ],
                check=True,
            )
            if wave.stat().st_size <= 4096:
                raise RuntimeError(
                    "say produced an empty AIFF file. Run this script from a normal "
                    "macOS Terminal if the current process is sandboxed."
                )
            target = output / f'{line["name"]}.mp3'
            encode_mp3(args.ffmpeg, wave, target)
            print(
                f'{target.name}: {voices[line["macos_role"]]} '
                f'@ {line["macos_rate"]} wpm'
            )


def generate_with_kokoro(args, output):
    if not args.model or not args.voices:
        raise RuntimeError("Kokoro generation requires MODEL.onnx and voices-v1.0.bin")

    import numpy as np
    import onnxruntime as ort
    import soundfile as sf
    from kokoro_onnx import Kokoro

    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    model = Kokoro.from_session(
        ort.InferenceSession(
            args.model,
            sess_options=options,
            providers=["CPUExecutionProvider"],
        ),
        args.voices,
    )

    with tempfile.TemporaryDirectory(prefix="moonlight-audio-") as temporary:
        wave = Path(temporary) / "line.wav"
        for line in LINES:
            audio, rate = model.create(
                line["text"],
                voice=line["voice"],
                speed=line["speed"],
                lang=line["language"],
            )
            if not np.isfinite(audio).all() or len(audio) < rate / 3:
                raise RuntimeError(f'Invalid generated audio: {line["name"]}')
            sf.write(wave, audio, rate)
            target = output / f'{line["name"]}.mp3'
            encode_mp3(args.ffmpeg, wave, target)
            print(f'{target.name}: {len(audio) / rate:.2f}s')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("model", nargs="?")
    parser.add_argument("voices", nargs="?")
    parser.add_argument("--backend", choices=("auto", "kokoro", "macos"), default="auto")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--say", default="say")
    parser.add_argument("--mabel-voice", default="Moira")
    parser.add_argument("--pip-voice", default="Junior")
    parser.add_argument("--reference-voice", default="Samantha")
    args = parser.parse_args()

    ffmpeg = shutil.which(args.ffmpeg)
    if not ffmpeg:
        parser.error(f"ffmpeg command not found: {args.ffmpeg}")
    args.ffmpeg = ffmpeg

    backend = args.backend
    if backend == "auto":
        backend = "kokoro" if args.model and args.voices else "macos"
    if backend == "macos" and sys.platform != "darwin":
        parser.error("The macos backend requires macOS and its built-in say command")

    output = Path(__file__).resolve().parents[1] / "assets" / "audio"
    output.mkdir(parents=True, exist_ok=True)
    if backend == "kokoro":
        generate_with_kokoro(args, output)
    else:
        generate_with_macos(args, output)


if __name__ == "__main__":
    main()
