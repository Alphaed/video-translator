# Contributing to Video Translator

Thank you for your interest in contributing! 🎉

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/video-translator.git
cd video-translator
```

### 2. Set Up Development Environment

```bash
# Create a virtual environment
python -m venv .venv
source .venv/bin/activate  # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Copy and configure
cp config.example.yaml config.yaml
# Edit config.yaml and fill in your API keys
```

### 3. Install FFmpeg

```bash
brew install ffmpeg  # macOS
# or: sudo apt install ffmpeg  # Ubuntu/Debian
```

## Branch Naming Convention

| Type | Pattern | Example |
|------|---------|--------|
| Feature | `feat/<short-description>` | `feat/batch-video-support` |
| Bug fix | `fix/<short-description>` | `fix/demucs-mps-crash` |
| Docs | `docs/<short-description>` | `docs/update-readme` |
| Refactor | `refactor/<short-description>` | `refactor/tts-alignment` |

## Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
[optional footer]
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

Examples:
```
feat: add batch video processing support
fix: handle missing face in lipsync gracefully
docs: update API usage in README
refactor: extract TTS timing logic to separate module
```

## Pipeline Overview

The translation pipeline consists of 6 sequential steps in `app/pipeline/`:

| Step | File | Responsibility |
|------|------|----------------|
| 1 | `step1_preprocess.py` | Audio extraction + Demucs vocal separation |
| 2 | `step2_asr.py` | Speech recognition + timestamp alignment |
| 3 | `step3_translate.py` | Duration-constrained contextual translation |
| 4 | `step4_tts.py` | TTS synthesis + speed/stretch alignment |
| 5 | `step5_lipsync.py` | Face detection + Sync.so lip-sync |
| 6 | `step6_assemble.py` | FFmpeg assembly + subtitle burn-in |

## Submitting a Pull Request

1. Create a feature branch from `main`
2. Make your changes with clear, atomic commits
3. Test your changes end-to-end with a short video
4. Open a PR against `main` with a descriptive title
5. Fill in the PR description explaining **what** and **why**

## Reporting Issues

Please use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) template when reporting bugs,
and the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) template for new ideas.

## Code Style

- Follow [PEP 8](https://peps.python.org/pep-0008/) for Python code
- Use type hints where possible
- Add docstrings to all public functions
- Keep comments in English for international contributors

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
