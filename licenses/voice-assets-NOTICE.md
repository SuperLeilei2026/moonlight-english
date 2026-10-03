# Character voice assets

The fixed MP3 files under `assets/audio/` are synthetic character voices, not recordings of real people. The files currently shipped in this repository were generated locally with the macOS `say` command and normalized to mono MP3 with FFmpeg. Mabel uses the Moira system voice, Pip uses Junior, and the reference question uses Samantha.

The reproducible recipe is `scripts/generate-game-audio.py`. Its default macOS backend requires the system `say` command and FFmpeg. The script also offers an optional Kokoro backend for maintainers who provide their own model inputs:

- Model: [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), Apache License 2.0.
- ONNX runtime wrapper: [thewh1teagle/kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), MIT License.

No speech model weights or voice data are included in this repository, and the published game does not download a voice model at runtime.
