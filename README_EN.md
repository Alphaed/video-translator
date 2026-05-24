[English](README_EN.md) | [中文](README.md)

# Video Translator

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)](https://www.python.org/)
[![License MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Platform macOS | Linux](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux-lightgrey)]()
[![release v1.0.0](https://img.shields.io/github/v/release/Alphaed/video-translator?color=orange)](https://github.com/Alphaed/video-translator/releases/latest)

**Upload a Chinese video. Get back a fully translated video, subtitles, and transcript — automatically.**

[Download Latest](https://github.com/Alphaed/video-translator/releases/latest) · [Report Bug](https://github.com/Alphaed/video-translator/issues) · [Request Feature](https://github.com/Alphaed/video-translator/issues)

---

## Features

| Feature | Technology | Description |
|---------|-----------|-------------|
| Speech Recognition | Qwen3-ASR-Flash | Chinese ASR with precise timestamp alignment |
| Contextual Translation | OpenAI GPT-4o | Context-aware translation with duration constraints |
| Text-to-Speech | OpenAI TTS | Natural voice synthesis with 3-stage timing alignment |
| Lip Sync | Sync.so | Smart face detection with automatic skip for non-face scenes |
| Multi-format Output | FFmpeg | Video, subtitles, dubbed audio, bilingual transcript |

---

## Requirements

- **OS**: macOS (M1/M2/M3) or Linux
- **Python**: 3.10+
- **FFmpeg**:

```bash
brew install ffmpeg
```

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/Alphaed/video-translator.git
cd video-translator
pip install -r requirements.txt
```

### 2. Configure API Keys

```bash
cp config.example.yaml config.yaml
```

Open `config.yaml` and fill in the following keys:

| Field | Where to get it |
|-------|-----------------|
| `api_keys.dashscope` | [Alibaba Cloud DashScope Console](https://dashscope.aliyun.com/) |
| `api_keys.openai` | [OpenAI Platform](https://platform.openai.com/) |
| `api_keys.syncso` | [Sync.so Dashboard](https://sync.so/) |

### 3. Run

**Option 1: Gradio Web UI (recommended)**

```bash
python run.py
```

Browser opens automatically at `http://127.0.0.1:7860`. Upload a video and click "Start Translation".

**Option 2: REST API**

```bash
python main.py
# → http://127.0.0.1:8000
```

Submit a task:

```bash
curl -X POST http://127.0.0.1:8000/tasks \
  -F "file=@your_video.mp4" \
  -F "target_language=English"
# Returns {"task_id": "a1b2c3d4", ...}
```

API docs: `http://127.0.0.1:8000/docs`

---

## Output Files

Results are saved to `outputs/task_id/`:

| File | Description |
|------|-------------|
| `output.mp4` | Translated video with burned-in subtitles |
| `output.srt` | Bilingual subtitle file |
| `dubbed.mp3` | Target-language dubbed audio track |
| `transcript.txt` | Original + translated text side by side |

---

## Pipeline

```
Video Input
|
├─ Step 1  FFmpeg + Demucs      Audio extraction · Vocal separation
├─ Step 2  Qwen3-ASR-Flash      Chinese ASR · Timestamp alignment
├─ Step 3  OpenAI               Duration-constrained translation · Subtitle generation
├─ Step 4  OpenAI TTS           TTS synthesis · 3-stage timing alignment
├─ Step 5  OpenCV + Sync.so     Face detection · Lip sync
└─ Step 6  FFmpeg               Segment assembly · Subtitle burn-in
```

---

## Project Structure

```
video-translator/
├── run.py                 # Gradio UI entry point
├── main.py                # FastAPI backend entry point
├── config.yaml            # Local config (not committed to git)
├── config.example.yaml    # Config template
├── requirements.txt
├── rthook_jaraco.py       # PyInstaller packaging fix: resolves jaraco import errors
└── app/
    ├── models/schemas.py  # Data models
    ├── pipeline/
    │   ├── step1_preprocess.py
    │   ├── step2_asr.py
    │   ├── step3_translate.py
    │   ├── step4_tts.py
    │   ├── step5_lipsync.py
    │   └── step6_assemble.py
    ├── utils/
    │   ├── ffmpeg_utils.py
    │   └── file_utils.py
    └── ui/
        └── gradio_app.py
```

---

## Notes

- `config.yaml` is in `.gitignore` and will not be committed
- Processing time is approximately 2–4× the video duration
- Lip sync only applies to scenes with detected faces; others are skipped automatically
- If your system uses a proxy, make sure `127.0.0.1` bypasses it before starting

---

## macOS Desktop App (Schai)

> **Schai** is the packaged macOS desktop version of Video Translator, built with PyInstaller + PyWebView. No Python environment setup required — just download and run. Feature-identical to the source version.

Don't want to configure a dev environment? Download the desktop app directly:

👉 **[Download Schai.dmg (v1.0.0)](https://github.com/Alphaed/video-translator/releases/latest)**

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, branch naming conventions, and how to submit a pull request.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full history of changes.

---

## License

[MIT License](LICENSE)
