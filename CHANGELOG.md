# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.0.0] - 2025-05-10

### Added
- 🎤 Chinese speech recognition via Qwen3-ASR-Flash (Alibaba DashScope)
- 🌐 Context-aware translation with duration constraints via OpenAI GPT-4o
- 🔊 High-quality TTS synthesis via OpenAI TTS with 3-stage duration alignment
- 👄 Intelligent lip-sync via Sync.so with automatic face detection
- 📝 Multi-format output: translated video, bilingual SRT, dubbed MP3, transcript
- 🖥️ Gradio web UI (`run.py`) for drag-and-drop video upload
- ⚡ FastAPI REST API backend (`main.py`) with async task queue
- 🎭 Demucs vocal separation to improve ASR accuracy
- 📦 macOS desktop app **Schai v1.0.0** (packaged with PyInstaller + PyWebView)
- ⚙️ YAML-based configuration with `config.example.yaml` template
- 🔒 Sensitive config excluded from git via `.gitignore`

### Pipeline Steps
- `step1_preprocess.py` — audio extraction + Demucs vocal separation
- `step2_asr.py` — speech recognition & timestamp alignment
- `step3_translate.py` — duration-constrained contextual translation
- `step4_tts.py` — TTS synthesis with speed/stretch alignment
- `step5_lipsync.py` — face detection + Sync.so lip-sync
- `step6_assemble.py` — FFmpeg final assembly + subtitle burn-in

### Supported Platforms
- macOS (M1 / M2 / M3 / Intel)
- Linux

---

## [Unreleased]

### Planned
- [ ] Support for non-Chinese source languages
- [ ] Batch processing for multiple videos
- [ ] Docker container for easier deployment
- [ ] Progress streaming via WebSocket
- [ ] Voice cloning / custom speaker profile support
