# 🎬 Video Translator

上传中文视频，经过六步全自动流水线，输出目标语言视频、外挂字幕、配音音轨和双语对照文稿。

## 功能特性

- 🎤 **中文语音识别**：Demucs 人声分离 + Qwen3-ASR-Flash，精准提取时间轴
- ✋ **人工审核节点**：ASR 结果和译文各有一次确认窗口，支持手动修改后继续
- 🌐 **约束时长翻译**：GPT-4o 批量翻译，自动限制译文字数不超长
- 🔊 **语音合成**：OpenAI TTS tts-1-hd，三阶段时长对齐（加速 / 静音填充 / 慢放）
- 👄 **口型同步**：OpenCV 人脸检测 + Sync.so，自动跳过无人脸画面
- ✂️ **间隙截断**：用户可自定义话间最大间隔（0.5 ~ 5.0 秒），超出部分自动丢弃
- 📝 **多语言字幕**：Whisper-1 对配音音轨重新识别，生成精准外挂 SRT（支持 99 种语言）
- 🎞️ **编解码一致**：所有片段统一输出 H.264 + AAC，避免 FFmpeg 拼接静音

## 支持语言

English · Japanese · Korean · Spanish · French · German · Portuguese · Arabic · Russian · Thai

## 环境要求

- macOS（M1/M2/M3）或 Linux
- Python 3.10+
- FFmpeg

```bash
brew install ffmpeg
```

## 安装

```bash
git clone https://github.com/你的用户名/video-translator.git
cd video-translator
pip install -r requirements.txt
```

## 配置

复制配置模板并填入 API Keys：

```bash
cp config.example.yaml config.yaml
```

打开 `config.yaml`，填入以下三个 Key：

| 字段 | 用途 | 获取地址 |
|---|---|---|
| `api_keys.dashscope` | 中文 ASR（Qwen3） | [阿里云百炼控制台](https://bailian.console.aliyun.com/) |
| `api_keys.openai` | 翻译 / TTS / 字幕 ASR | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `api_keys.syncso` | 口型同步 | [Sync.so Dashboard](https://sync.so/) |

## 启动

```bash
bash start.sh
# → 后端运行在 http://127.0.0.1:8000
# → 前端界面：http://127.0.0.1:8000/ui
```

关闭服务：

```bash
lsof -ti:8000 | xargs kill -9
```

## 使用流程

1. 打开 `http://127.0.0.1:8000/ui`
2. 在**输入设置**面板上传中文视频，选择目标语言
3. 按需调整口型同步开关和话间最大间隔
4. 点击「🚀 开始翻译」，在**处理结果**面板实时查看进度
5. 两次人工确认窗口（ASR 识别结果 → 译文），可直接编辑后继续
6. 完成后在**合成监看**面板在线预览，下载视频 / SRT / 文稿

## 处理流程

```
视频输入
  │
  ├─ Step 1  FFmpeg + Demucs      音视频分离 · 人声提取
  ├─ Step 2  Qwen3-ASR-Flash      中文语音识别 · 时间轴对齐
  │          ⏸ 人工确认 ASR 结果
  ├─ Step 3  GPT-4o               约束时长翻译
  │          ⏸ 人工确认译文
  ├─ Step 4  OpenAI tts-1-hd      语音合成 · 三阶段时长对齐
  ├─ Step 5  OpenCV + Sync.so     人脸检测 · 口型同步
  └─ Step 6  FFmpeg + Whisper-1   片段拼接（含间隙截断） · 字幕生成
```

## 输出文件

任务完成后，结果保存在 `outputs/<task_id>/`：

| 文件 | 说明 |
|---|---|
| `output.mp4` | 翻译后干净视频（无烧录字幕，配合 SRT 外挂使用） |
| `output.srt` | 外挂字幕文件（Whisper-1 精准时间戳） |
| `dubbed.mp3` | 目标语言配音音轨 |
| `transcript.txt` | 原文 + 译文对照文稿 |

## 前端界面参数说明

| 参数 | 说明 | 默认值 |
|---|---|---|
| 目标语言 | 翻译和 TTS 的输出语言 | English |
| 启用口型同步 | 调用 Sync.so（产生额外费用） | ✅ 开启 |
| 话间最大间隔 | 两段语音之间保留的最大静默时长，超出部分截断 | 2.0 秒 |

## 项目结构

```
video-translator/
├── start.sh                      # 一键启动脚本
├── main.py                       # FastAPI 后端
├── config.yaml                   # 配置文件（本地，不上传 Git）
├── config.example.yaml           # 配置模板
├── requirements.txt
├── frontend/                     # Web 前端（纯 HTML + React CDN）
│   ├── index.html                # 主页面（三栏布局）
│   ├── UploadPanel.jsx           # 输入设置面板
│   ├── OutputPanel.jsx           # 处理结果 + 实时日志
│   ├── PreviewPanel.jsx          # 合成监看 + 下载
│   └── LiveStatus.jsx            # 实时日志流组件
└── app/
    ├── models/schemas.py         # 数据结构定义
    ├── pipeline/
    │   ├── step1_preprocess.py   # 音视频预处理
    │   ├── step2_asr.py          # 语音识别
    │   ├── step3_translate.py    # 翻译
    │   ├── step4_tts.py          # 语音合成 + 时长对齐
    │   ├── step5_lipsync.py      # 口型同步
    │   └── step6_assemble.py     # 片段拼接 · 间隙截断 · 字幕生成
    └── utils/
        ├── ffmpeg_utils.py       # FFmpeg 封装
        └── file_utils.py         # 文件管理
```

## 注意事项

- `config.yaml` 已加入 `.gitignore`，不会上传到 GitHub
- 处理时间约为视频时长的 2 ~ 4 倍
- 口型同步仅对含人脸的画面生效，其余自动跳过以节省费用
- Step 6 字幕使用 Whisper-1 对配音音轨重新 ASR，支持所有目标语言（非中文专用）
- 如系统配置了代理，启动前确保 `127.0.0.1` 不走代理
