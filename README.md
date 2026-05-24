[English](README_EN.md) | 中文

# 🎬 Video Translator

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux-lightgrey)
![Release](https://img.shields.io/github/v/release/Alphaed/video-translator?color=orange)

**上传中文视频，全自动翻译为目标语言视频、字幕和文字稿。**

[📦 下载最新版本](https://github.com/Alphaed/video-translator/releases/latest) · [🐛 报告问题](https://github.com/Alphaed/video-translator/issues) · [💡 功能建议](https://github.com/Alphaed/video-translator/issues)

</div>

---

## ✨ 功能特性

| 功能 | 技术 | 说明 |
|------|------|------|
| 🎤 语音识别 | Qwen3-ASR-Flash | 中文语音识别，时间轴精准对齐 |
| 🌐 上下文翻译 | OpenAI GPT | 感知语境，自动约束时长 |
| 🔊 语音合成 | OpenAI TTS | 自然语音，三阶段时长对齐 |
| 👄 口型同步 | Sync.so | 智能检测人脸，自动跳过无人脸场景 |
| 📝 多格式输出 | FFmpeg | 视频、字幕、配音、对照文稿一键生成 |

---

## 🖥️ 系统要求

- **操作系统**：macOS（M1/M2/M3）或 Linux
- **Python**：3.10+
- **FFmpeg**：

```bash
brew install ffmpeg
```

---

## 🚀 快速开始

### 1. 安装

```bash
git clone https://github.com/Alphaed/video-translator.git
cd video-translator
pip install -r requirements.txt
```

### 2. 配置 API Keys

```bash
cp config.example.yaml config.yaml
```

打开 `config.yaml`，填入以下三个 Key：

| 字段 | 获取地址 |
|------|----------|
| `api_keys.dashscope` | [阿里云百炼控制台](https://bailian.console.aliyun.com/) |
| `api_keys.openai` | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `api_keys.syncso` | [Sync.so Dashboard](https://sync.so/) |

其他可选配置：

```yaml
translation:
  target_language: "English"   # 目标语言

lipsync:
  enabled: true                # 是否启用口型同步
```

### 3. 启动

**方式一：Gradio 可视化界面（推荐）**

```bash
python run.py
```

浏览器自动打开 http://127.0.0.1:7860，上传视频后点击「开始翻译」。

**方式二：REST API**

```bash
python main.py
# → http://127.0.0.1:8000
```

提交任务：

```bash
curl -X POST http://127.0.0.1:8000/tasks \
  -F "file=@your_video.mp4" \
  -F "target_language=English"
# 返回 {"task_id": "a1b2c3d4", ...}
```

查询进度：

```bash
curl http://127.0.0.1:8000/tasks/a1b2c3d4
```

接口文档：http://127.0.0.1:8000/docs

---

## 📂 输出文件

任务完成后，结果保存在 `outputs/<task_id>/`：

| 文件 | 说明 |
|------|------|
| `output.mp4` | 翻译后视频（含字幕） |
| `output.srt` | 双语字幕文件 |
| `dubbed.mp3` | 目标语言配音音轨 |
| `transcript.txt` | 原文 + 译文对照文稿 |

---

## 🔄 处理流程

```
视频输入
│
├─ Step 1  FFmpeg + Demucs   音视频分离 · 人声提取
├─ Step 2  Qwen3-ASR-Flash   中文语音识别 · 时间轴对齐
├─ Step 3  OpenAI            约束时长翻译 · 字幕生成
├─ Step 4  OpenAI TTS        语音合成 · 三阶段时长对齐
├─ Step 5  OpenCV + Sync.so  人脸检测 · 口型同步
└─ Step 6  FFmpeg            片段拼接 · 字幕烧录
```

---

## 🗂️ 项目结构

```
video-translator/
├── run.py                   # Gradio 界面启动入口
├── main.py                  # FastAPI 后端启动入口
├── config.yaml              # 配置文件（本地，不上传 Git）
├── config.example.yaml      # 配置模板
├── requirements.txt
├── rthook_jaraco.py      # PyInstaller 打包修复：解决 jaraco 包导入错误
└── app/
    ├── models/schemas.py    # 数据结构定义
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

## ⚠️ 注意事项

- `config.yaml` 已加入 `.gitignore`，不会上传到 GitHub
- 处理时间约为视频时长的 **2～4 倍**
- 口型同步仅对含人脸的画面生效，其他场景自动跳过以节省费用
- 如系统配置了代理，启动前确保 `127.0.0.1` 不走代理

---

## 📦 macOS 桌面版（Schai）
> **Schai** 是 Video Translator 的 macOS 打包版，基于 PyInstaller + PyWebView 构建。无需配置 Python 环境，开箱即用，与源码版功能完全一致。
不想配置环境？直接下载桌面应用：

👉 **[下载 Schai.dmg（v1.0.0）](https://github.com/Alphaed/video-translator/releases/latest)**

---

## 📄 License

[MIT License](LICENSE)
