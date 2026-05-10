# 🎬 Video Translator

上传中文视频，经过六步全自动流水线，输出目标语言视频、外挂字幕、配音音轨和双语对照文稿。支持在线预览、任务历史管理和 API 密钥的图形化配置。

## 功能特性

- 🎤 **中文语音识别**：Qwen3-ASR-Flash 精准提取时间轴，支持话间间隔自定义截断
- ✋ **两次人工确认**：ASR 结果和译文各一次审核窗口，支持手动编辑后继续
- 🌐 **约束时长翻译**：GPT-4o 批量翻译，按目标语言语速自动限制字数，防止超长
- 🔊 **双 TTS 引擎**：OpenAI TTS（云端）或 Voicebox（本地克隆声音），三阶段时长对齐
- 👄 **口型同步**：OpenCV 人脸检测 + Sync.so，自动跳过无人脸画面节省费用
- ✂️ **间隙截断**：自定义话间最大间隔（0.5 ~ 5.0 秒），超出部分自动丢弃
- 📝 **多语言字幕**：Whisper-1 对配音音轨重新识别，生成精准外挂 SRT
- 🎞️ **编解码统一**：所有片段统一 H.264 + AAC，避免 FFmpeg 拼接出现静音
- 📋 **任务历史**：持久化历史记录，支持在线预览、文件下载和单条删除
- ⚙️ **图形化配置**：前端 API 管理面板，可直接修改密钥和模型，实时生效

## 支持目标语言

English · Japanese · Korean · Spanish · French · German · Portuguese · Arabic · Russian · Thai

> ⚠️ 使用 **Voicebox** 本地 TTS 时，Thai（泰语）暂不支持，请切换回 OpenAI TTS。

---

## 系统要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| macOS / Linux | — | Apple Silicon (M1/M2/M3) 或 x86_64 |
| Python | 3.10+ | 推荐 conda 环境 |
| FFmpeg | 任意新版 | 必须包含 `libmp3lame`（`brew install ffmpeg` 默认包含） |

```bash
# macOS 安装 FFmpeg
brew install ffmpeg
```

---

## 安装

```bash
git clone https://github.com/你的用户名/video-translator.git
cd video-translator
pip install -r requirements.txt
```

---

## 配置

### 1. 复制配置模板

```bash
cp config.example.yaml config.yaml
```

### 2. 填入 API Keys

`config.yaml` 中需要填写以下密钥（也可以在启动后通过前端**⚙️ API 管理**面板修改）：

| 字段 | 步骤 | 用途 | 获取地址 |
|---|---|---|---|
| `api_keys.dashscope` | Step 2 | 中文 ASR（Qwen3） | [阿里云百炼控制台](https://bailian.console.aliyun.com/) |
| `api_keys.openai` | Step 3/4/6 | 翻译 / TTS / 字幕 ASR | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `api_keys.syncso` | Step 5 | 口型同步 | [Sync.so Dashboard](https://sync.so/) |

### 3. TTS 引擎选择

`config.yaml` 中 `tts_provider` 字段控制 Step 4 的 TTS 引擎：

```yaml
# 方案 A：OpenAI 云端 TTS（默认，无需额外部署）
tts_provider: "openai"

# 方案 B：Voicebox 本地 TTS（支持声音克隆，需本地部署）
tts_provider: "voicebox"
voicebox:
  url: "http://127.0.0.1:17493"   # Voicebox 服务地址
  profile_id: ""                   # 克隆声音的 Profile ID（留空则使用默认声音）
  engine: "qwen"                   # qwen / luxtts / chatterbox 等
  model_size: "1.7B"               # 0.6B / 1B / 1.7B / 3B
```

**Voicebox 安装**：前往 [voicebox.sh](https://voicebox.sh) 下载本地服务，启动后在界面中创建声音 Profile，再将 Profile ID 填入配置或通过 API 管理面板选择。

### 4. 其他常用配置

```yaml
translation:
  target_language: "English"        # 默认目标语言

timing:
  max_audio_speedup_ratio: 1.20     # Stage 2：TTS 最多加速 20%
  max_video_stretch_ratio: 1.30     # Stage 3：视频最多拉伸 30%

lipsync:
  enabled: true                     # 是否启用口型同步（可在前端覆盖）

paths:
  ffmpeg: "/usr/local/bin/ffmpeg"   # FFmpeg 可执行文件路径
```

---

## 启动 / 停止

```bash
# 启动（自动清理端口，使用 conda base 环境）
bash start.sh

# 停止
bash stop.sh
```

启动后访问：**http://127.0.0.1:8000/ui**

---

## 使用流程

```
① 上传视频       选择目标语言，设置口型同步和话间间隔
       ↓
② 自动处理中     进度条 + 实时日志，逐步执行六个步骤
       ↓
③ ASR 确认       检查语音识别结果，可手动修改文本后继续
       ↓
④ 译文确认       检查翻译结果，可逐段编辑后继续
       ↓
⑤ 自动完成       TTS 合成 → 口型同步 → 拼接 → 字幕生成
       ↓
⑥ 下载结果       预览视频，下载 MP4 / SRT / MP3 / 文稿
```

---

## 处理流程（六步流水线）

```
视频输入
  │
  ├─ Step 1  FFmpeg               音视频分离、提取人声轨道
  ├─ Step 2  Qwen3-ASR-Flash      中文语音识别，生成带时间戳字幕段
  │          ⏸ 人工确认 ASR 结果（可编辑）
  ├─ Step 3  GPT-4o               约束时长批量翻译
  │          ⏸ 人工确认译文（可编辑）
  ├─ Step 4  OpenAI TTS / Voicebox  语音合成 + 三阶段时长对齐
  │            Stage 1 — 补静音（TTS 比原始短）
  │            Stage 2 — 音频加速（ratio ≤ 1.20）
  │            Stage 3 — 视频拉伸（ratio > 1.20）
  ├─ Step 5  OpenCV + Sync.so     人脸检测 + 口型同步（无人脸自动跳过）
  └─ Step 6  FFmpeg + Whisper-1   片段拼接（含间隙截断）+ 字幕生成
```

---

## 输出文件

任务完成后，结果保存在 `outputs/<task_id>/`：

| 文件 | 说明 |
|---|---|
| `output.mp4` | 翻译后视频（无烧录字幕，配合 SRT 外挂使用） |
| `output.srt` | 外挂字幕（Whisper-1 精准时间戳，UTF-8） |
| `dubbed.mp3` | 目标语言配音音轨（独立文件，可单独使用） |
| `transcript.txt` | 原文 + 译文双语对照文稿 |
| `meta.json` | 任务元数据（语言、时间、设置等） |

---

## 前端界面

### 主界面参数

| 参数 | 说明 | 默认值 |
|---|---|---|
| 目标语言 | 翻译和 TTS 的输出语言 | English |
| 启用口型同步 | 调用 Sync.so（产生额外费用） | 开启 |
| 话间最大间隔 | 两段语音之间保留的最大静默时长，超出部分截断 | 2.0 秒 |

### API 管理面板（⚙️）

点击顶栏右侧 **⚙️ API 管理** 可以：

- 查看和修改各步骤的 API Key（带显隐切换）
- 切换 Step 4 TTS 引擎（OpenAI / Voicebox）
- Voicebox 模式下：设置服务地址、从在线列表选择声音 Profile、配置引擎和模型大小
- 保存后立即生效，同步写回 `config.yaml`

### 任务历史面板（📋）

点击顶栏 **📋 任务历史** 可以：

- 查看所有已完成任务的列表（含语言、文件名、完成时间）
- 在线预览已完成任务的视频
- 独立下载：视频 MP4 / 字幕 SRT / 配音 MP3 / 双语文稿
- 删除历史任务及其全部输出文件

---

## 项目结构

```
video-translator/
├── start.sh                      # 一键启动（自动清理端口）
├── stop.sh                       # 停止服务
├── main.py                       # FastAPI 后端（API 路由 + 流水线调度）
├── config.yaml                   # 配置文件（本地，不上传 Git）
├── config.example.yaml           # 配置模板
├── requirements.txt
│
├── frontend/                     # Web 前端（纯 HTML + React CDN，无需构建）
│   ├── index.html                # 主入口（三栏布局）
│   ├── Primitives.jsx            # 基础 UI 组件
│   ├── Header.jsx                # 顶栏（历史 / API 管理入口）
│   ├── PipelineStepper.jsx       # 六步进度条
│   ├── UploadPanel.jsx           # 输入设置面板
│   ├── OutputPanel.jsx           # 处理结果 + 实时日志
│   ├── LiveStatus.jsx            # 实时日志流组件
│   ├── ReviewPanel.jsx           # ASR / 译文人工确认面板
│   ├── PreviewPanel.jsx          # 合成监看 + 下载
│   ├── HistoryPanel.jsx          # 任务历史模态框
│   └── ApiPanel.jsx              # API 管理模态框
│
└── app/
    ├── models/
    │   └── schemas.py            # Pydantic 数据模型
    ├── pipeline/
    │   ├── step1_preprocess.py   # 音视频预处理
    │   ├── step2_asr.py          # Qwen3 语音识别
    │   ├── step3_translate.py    # GPT-4o 约束时长翻译
    │   ├── step4_tts.py          # TTS 合成 + 三阶段时长对齐（OpenAI / Voicebox）
    │   ├── step5_lipsync.py      # OpenCV 人脸检测 + Sync.so 口型同步
    │   └── step6_assemble.py     # 片段拼接 + 间隙截断 + Whisper 字幕
    └── utils/
        ├── ffmpeg_utils.py       # FFmpeg / ffprobe 封装
        └── file_utils.py         # 文件路径管理
```

---

## API 端点速查

后端运行后可访问 `http://127.0.0.1:8000/docs` 查看完整 Swagger 文档，常用端点：

| 端点 | 说明 |
|---|---|
| `POST /tasks` | 提交翻译任务（上传视频） |
| `GET /tasks/{id}` | 查询任务状态和进度 |
| `GET /tasks/{id}/segments` | 获取字幕段数据（用于审核） |
| `POST /tasks/{id}/confirm/asr` | 提交 ASR 审核结果 |
| `POST /tasks/{id}/confirm/translation` | 提交译文审核结果 |
| `GET /tasks/{id}/download/video` | 下载输出视频 |
| `GET /tasks/{id}/download/srt` | 下载字幕文件 |
| `GET /tasks/{id}/download/audio` | 下载配音音轨 |
| `GET /tasks/{id}/download/transcript` | 下载双语文稿 |
| `DELETE /tasks/{id}/outputs` | 删除任务输出 |
| `GET /history` | 获取历史任务列表 |
| `GET /config/api` | 获取当前 API 配置 |
| `PUT /config/api` | 更新 API 配置（写回 config.yaml） |
| `GET /voicebox/profiles` | 获取 Voicebox 声音 Profile 列表 |

---

## 注意事项

- `config.yaml` 已加入 `.gitignore`，包含密钥，不会上传到 Git 仓库
- 处理时间约为视频时长的 **2 ~ 5 倍**（取决于视频长度、口型同步和网络速度）
- 口型同步仅对含人脸的画面生效，其余片段自动跳过以节省 API 费用
- Voicebox 本地 TTS 首次生成可能需要较长时间（模型加载），后续速度正常
- 如系统配置了代理，确保 `127.0.0.1` 不经过代理（`no_proxy=127.0.0.1`）
- 前端使用 React CDN + Babel Standalone，无需 Node.js，直接由 FastAPI 静态服务提供

## 费用估算（参考）

| 服务 | 计费方式 | 说明 |
|---|---|---|
| DashScope ASR | 按时长 | 约 ¥0.1 / 分钟 |
| OpenAI GPT-4o | 按 Token | 翻译一般较便宜 |
| OpenAI TTS | 按字符 | 约 $0.015 / 1000 字符 |
| OpenAI Whisper | 按时长 | $0.006 / 分钟 |
| Sync.so | 按时长 | 口型同步，仅人脸画面计费 |
| Voicebox | 本地免费 | 需自行部署，电力 + 硬件成本 |
