"""
step4_tts.py — TTS 语音合成 + 三阶段时长对齐
支持 OpenAI TTS 和本地 Voicebox 两种 TTS 提供商，通过三阶段策略确保与原始视频时长对齐。

三阶段策略（按超长程度分级）：
  Stage 1 — 约束翻译（Step 3 已处理，此处不重复）
  Stage 2 — TTS 音频加速（ratio ≤ 1.20，atempo 滤镜）
  Stage 3 — 视频片段拉伸（ratio > 1.20，setpts 滤镜）
"""

import asyncio
import json as _json
import logging
from pathlib import Path

import httpx
from openai import AsyncOpenAI

from app.models.schemas import TranslationTask, Segment
from app.utils.file_utils import get_task_workspace
from app.utils.ffmpeg_utils import speedup_audio, get_video_duration, run_ffmpeg

logger = logging.getLogger(__name__)

# OpenAI TTS API 每次请求之间的最小间隔（秒），避免触发速率限制
TTS_REQUEST_INTERVAL = 0.2

# Voicebox 语言代码映射（目标语言名称 → BCP-47 代码）
# 仅列出 Voicebox 支持的语言；Thai 不在支持列表内（backend 已在提交时拦截）
VOICEBOX_LANG_MAP: dict[str, str] = {
    "English":    "en",
    "Japanese":   "ja",
    "Korean":     "ko",
    "Spanish":    "es",
    "French":     "fr",
    "German":     "de",
    "Portuguese": "pt",
    "Arabic":     "ar",
    "Russian":    "ru",
}


async def synthesize_tts(task: TranslationTask, config: dict) -> None:
    """
    Step 4 主函数：为每个字幕片段合成目标语言语音，并对齐时长。

    执行后填充：
      segment.tts_audio_path       ← 原始 TTS 音频
      segment.tts_duration         ← TTS 实际时长（秒）
      segment.aligned_audio_path   ← 时长对齐后的音频
    """
    provider  = config.get("tts_provider", "openai").lower()
    workspace = get_task_workspace(task.task_id, config)
    tts_dir   = workspace / "tts"
    tts_dir.mkdir(exist_ok=True)

    max_speedup = config["timing"]["max_audio_speedup_ratio"]   # 默认 1.20

    if provider == "voicebox":
        logger.info(f"[{task.task_id}] TTS 合成 {len(task.segments)} 段（提供商: Voicebox）")
    else:
        model = config["models"]["tts"]
        voice = config["models"]["tts_voice"]
        client = AsyncOpenAI(api_key=config["api_keys"]["openai"])
        logger.info(f"[{task.task_id}] TTS 合成 {len(task.segments)} 段（模型: {model}, 声音: {voice}）")

    for seg in task.segments:
        if not seg.translated_text.strip():
            # 跳过空片段（可能是无声段落）
            seg.tts_audio_path = ""
            seg.aligned_audio_path = ""
            continue

        # ── 合成 TTS 音频 ──────────────────────────────────────
        # Voicebox 中间产物用 WAV（无损），OpenAI TTS 直接输出 MP3
        tts_ext  = "wav" if provider == "voicebox" else "mp3"
        tts_path = str(tts_dir / f"seg_{seg.index:04d}_tts.{tts_ext}")

        if provider == "voicebox":
            audio_bytes, vb_duration = await _synthesize_voicebox(
                text=seg.translated_text,
                language=task.target_language,
                config=config,
            )
            # Voicebox 可能返回 WAV/OGG/MP3 等格式，先写临时文件再用 ffmpeg 统一转码
            # 使用 .tmp 扩展名，避免 ffmpeg 因 .raw 等扩展名误判格式
            # 输出为无损 PCM WAV，保留完整音色，推迟有损编码到最终 replace_audio 步骤
            raw_path = tts_path + ".tmp"
            with open(raw_path, "wb") as f:
                f.write(audio_bytes)
            await run_ffmpeg([
                "-y",
                "-analyzeduration", "100M",
                "-probesize", "100M",
                "-i", raw_path,
                "-vn",                        # 忽略视频流（防止 Voicebox 返回带封面的音频）
                "-c:a", "pcm_s16le",          # 无损 PCM，保留原始音色
                tts_path,
            ], config)
            Path(raw_path).unlink(missing_ok=True)
            # 优先使用 Voicebox 响应里的 duration，避免 ffprobe 开销
            seg.tts_duration = float(vb_duration) if vb_duration else get_video_duration(tts_path, config)
        else:
            await _synthesize_single(
                text=seg.translated_text,
                output_path=tts_path,
                client=client,
                model=model,
                voice=voice,
            )
            seg.tts_duration = get_video_duration(tts_path, config)

        seg.tts_audio_path = tts_path

        # ── 三阶段时长对齐 ─────────────────────────────────────
        aligned_path = await _align_duration(
            seg=seg,
            tts_dir=tts_dir,
            config=config,
            max_speedup=max_speedup,
        )
        seg.aligned_audio_path = aligned_path

        logger.debug(
            f"  片段 #{seg.index}: 原始 {seg.original_duration:.2f}s | "
            f"TTS {seg.tts_duration:.2f}s | 比率 {seg.timing_ratio:.2f} | "
            f"对齐后 -> {Path(aligned_path).name}"
        )

        # 避免触发 API 速率限制（OpenAI；Voicebox 本地无需限速）
        if provider != "voicebox":
            await asyncio.sleep(TTS_REQUEST_INTERVAL)

    logger.info(f"[{task.task_id}] TTS 合成完成")


def _parse_sse_json(content: bytes) -> dict | None:
    """
    解析 Server-Sent Events 格式，提取最后一条 `data: {...}` 行的 JSON。
    Voicebox /generate/{id}/status 返回 SSE 格式：
      data: {"status":"completed","audio_path":"..."}
    """
    try:
        text = content.decode("utf-8", errors="replace")
    except Exception:
        return None
    last_data: dict | None = None
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("data:"):
            payload = line[5:].strip()
            if payload and payload != "[DONE]":
                try:
                    last_data = _json.loads(payload)
                except _json.JSONDecodeError:
                    pass
    return last_data


def _is_audio_bytes(data: bytes) -> bool:
    """
    根据文件头魔数判断是否是已知音频格式。
    WAV=RIFF, MP3=ID3/\xff\xfb, OGG=OggS, FLAC=fLaC, M4A/AAC=\x00\x00\x00 ftyp
    """
    if len(data) < 4:
        return False
    h = data[:12]
    return (
        h[:4] == b"RIFF"            # WAV
        or h[:3] == b"ID3"          # MP3 with ID3 tag
        or h[:2] == b"\xff\xfb"     # MP3 frame sync
        or h[:2] == b"\xff\xf3"     # MP3 frame sync variant
        or h[:4] == b"OggS"         # OGG / Opus
        or h[:4] == b"fLaC"         # FLAC
        or (h[4:8] == b"ftyp")      # MP4 / M4A / AAC
    )


async def _download_voicebox_audio(
    client: httpx.AsyncClient,
    vb_url: str,
    gen_id: str,
    active_version_id: str | None,
    audio_path_field: str | None,
) -> bytes:
    """
    多策略下载 Voicebox 音频，返回原始音频字节。

    优先级：
      1. GET /audio/version/{active_version_id}（如果有 version_id）
      2. GET /audio/{gen_id}
      3. GET /history/{gen_id}/export-audio
      4. 直接读本地 audio_path 文件（同机部署时可用）
    每个策略都会验证魔数是否是真实音频。
    """
    attempts: list[tuple[str, str]] = []

    if active_version_id:
        attempts.append((f"{vb_url}/audio/version/{active_version_id}",
                         f"/audio/version/{active_version_id}"))
    attempts.append((f"{vb_url}/audio/{gen_id}", f"/audio/{gen_id}"))
    attempts.append((f"{vb_url}/history/{gen_id}/export-audio",
                     f"/history/{gen_id}/export-audio"))

    # 明确请求音频二进制，避免服务端返回 JSON 元数据
    audio_headers = {"Accept": "audio/wav, audio/mpeg, audio/ogg, audio/*, */*"}

    last_err = ""
    for url, label in attempts:
        try:
            dl = await client.get(url, headers=audio_headers)
            ct   = dl.headers.get("content-type", "")
            body = dl.content
            logger.info(
                f"  Voicebox {label}: status={dl.status_code} "
                f"content-type={ct} size={len(body)}B head={body[:12].hex()!r}"
            )
            if dl.status_code != 200:
                last_err = f"{label} 返回 HTTP {dl.status_code}"
                continue
            if body[:1] in (b"{", b"["):
                # JSON 响应（错误体或元数据），记录后跳过
                try:
                    err_obj = _json.loads(body)
                    last_err = f"{label} 返回 JSON: {_json.dumps(err_obj)[:120]}"
                except Exception:
                    last_err = f"{label} 返回疑似 JSON"
                logger.warning(f"  {last_err}")
                continue
            if not _is_audio_bytes(body):
                last_err = (f"{label} 返回非音频内容 "
                            f"(head={body[:12].hex()!r}, size={len(body)}B)")
                logger.warning(f"  {last_err}")
                continue
            # 验证通过
            logger.debug(f"  Voicebox 音频下载成功: {label} ({len(body)}B)")
            return body
        except Exception as e:
            last_err = f"{label} 请求失败: {e}"
            logger.warning(f"  {last_err}")

    # 最后尝试直接读本地文件（适用于 Voicebox 与翻译工具同机运行）
    if audio_path_field:
        local = Path(audio_path_field)
        if local.exists() and local.stat().st_size > 0:
            body = local.read_bytes()
            logger.debug(f"  Voicebox 直接读本地文件: {audio_path_field} ({len(body)}B)")
            if _is_audio_bytes(body):
                return body
            logger.warning(f"  本地文件不是有效音频: head={body[:12].hex()!r}")

    raise RuntimeError(
        f"Voicebox 音频下载全部失败（gen_id={gen_id}）。最后错误: {last_err}"
    )


async def _synthesize_single(
    text: str,
    output_path: str,
    client: AsyncOpenAI,
    model: str,
    voice: str,
) -> None:
    """
    调用 OpenAI TTS API 合成单段语音。
    输出格式：mp3（OpenAI TTS 默认格式，体积小）
    """
    response = await client.audio.speech.create(
        model=model,
        voice=voice,
        input=text,
        response_format="mp3",
        speed=1.0,   # 初始语速为正常速度；时长对齐由后处理完成
    )
    # 写入文件（新版 SDK 的 iter_bytes 是同步的）
    with open(output_path, "wb") as f:
        for chunk in response.iter_bytes(chunk_size=4096):
            f.write(chunk)


async def _synthesize_voicebox(
    text: str,
    language: str,
    config: dict,
) -> tuple[bytes, float | None]:
    """
    调用本地 Voicebox API 合成语音。

    返回 (音频字节, 时长秒) —— 时长来自 GenerationResponse.duration，
    可能为 None（由调用方 fallback 到 ffprobe）。

    Voicebox POST /generate 是同步调用：通常阻塞到生成完成才返回，
    response.status 默认值为 "completed"。极少数情况下可能需要轮询，
    此时 GET /generate/{id}/status 可能返回空 body（处理中），
    需特殊处理。
    """
    vb_cfg     = config.get("voicebox", {})
    vb_url     = vb_cfg.get("url", "http://127.0.0.1:17493").rstrip("/")
    profile_id = vb_cfg.get("profile_id", "")
    engine     = vb_cfg.get("engine", "qwen")
    model_size = vb_cfg.get("model_size", "1.7B")

    lang_code = VOICEBOX_LANG_MAP.get(language, "en")

    payload: dict = {
        "text":       text,
        "language":   lang_code,
        "engine":     engine,
        "model_size": model_size,
    }
    if profile_id:
        payload["profile_id"] = profile_id

    # POST /generate 是同步调用，使用较长超时
    async with httpx.AsyncClient(timeout=300.0) as client:
        # ── 1. 同步生成（通常直接返回 completed）────────────────
        resp = await client.post(f"{vb_url}/generate", json=payload)
        resp.raise_for_status()
        result    = resp.json()
        gen_id    = result.get("id", "")
        status    = result.get("status", "")
        duration  = result.get("duration")   # float | None，直接使用省去 ffprobe

        logger.info(f"  Voicebox POST 响应: id={gen_id} status={status} "
                    f"duration={duration} audio_path={result.get('audio_path')}")

        # ── 2. 轮询（status 非 completed 时）───────────────────────
        audio_path_field    = result.get("audio_path")
        active_version_id   = result.get("active_version_id")

        if status != "completed":
            logger.info(f"  Voicebox 生成中 (status={status})，轮询直到完成…")
            for attempt in range(90):   # 最多 90 × 2 = 180 秒
                await asyncio.sleep(2)
                poll = await client.get(f"{vb_url}/generate/{gen_id}/status")

                # 每 5 次输出一条进度（避免刷屏）
                if attempt % 5 == 0:
                    logger.info(f"  Voicebox 轮询 #{attempt}: "
                                f"HTTP {poll.status_code} size={len(poll.content)}B "
                                f"head={poll.content[:8].hex()!r}")

                if not poll.content:
                    continue   # 空 body = 仍在生成中

                # 尝试解析 JSON
                try:
                    poll_data = poll.json()
                    status    = poll_data.get("status", status)
                    duration  = poll_data.get("duration", duration)
                    # 更新 audio_path / active_version_id（完成后可能填充）
                    audio_path_field  = poll_data.get("audio_path") or audio_path_field
                    active_version_id = poll_data.get("active_version_id") or active_version_id
                    logger.info(f"  Voicebox 轮询 #{attempt}: status={status}")
                    if status == "completed":
                        break
                    if status in ("failed", "error"):
                        raise RuntimeError(f"Voicebox 生成失败: {poll_data.get('error', '未知')}")
                except ValueError:
                    # 非普通 JSON — 先尝试 SSE 格式 (data: {...})
                    logger.info(f"  Voicebox 轮询 #{attempt}: 非 JSON 响应 "
                                f"({len(poll.content)}B head={poll.content[:8].hex()!r})")
                    sse = _parse_sse_json(poll.content)
                    if sse:
                        status    = sse.get("status", status)
                        duration  = sse.get("duration", duration)
                        audio_path_field  = sse.get("audio_path") or audio_path_field
                        active_version_id = sse.get("active_version_id") or active_version_id
                        logger.info(f"  Voicebox 轮询 #{attempt} (SSE): status={status} "
                                    f"audio_path={audio_path_field}")
                        if status == "completed":
                            break
                        if status in ("failed", "error"):
                            raise RuntimeError(f"Voicebox 生成失败: {sse.get('error', '未知')}")
                        continue   # 仍在生成中
                    # 不是 SSE，检查是否是音频二进制
                    if _is_audio_bytes(poll.content):
                        logger.info("  Voicebox 状态端点直接返回了音频数据")
                        return poll.content, duration
                    # 未知格式，继续等待
                    continue
            else:
                raise TimeoutError("Voicebox 生成超时（超过 180 秒）")

        logger.info(f"  Voicebox 生成完成: gen_id={gen_id} duration={duration}s "
                    f"audio_path={audio_path_field}")

        # ── 3. 下载音频（多策略，按优先级尝试）────────────────────
        audio_bytes = await _download_voicebox_audio(
            client=client,
            vb_url=vb_url,
            gen_id=gen_id,
            active_version_id=active_version_id,
            audio_path_field=audio_path_field,
        )
        return audio_bytes, duration


async def _align_duration(
    seg: Segment,
    tts_dir: Path,
    config: dict,
    max_speedup: float,
) -> str:
    """
    三阶段时长对齐逻辑。
    根据 timing_ratio（TTS时长 / 原始时长）决定处理方式：

    ratio ≤ 1.0  → TTS 比原始更短，直接使用（自然留白）
    1.0 < ratio ≤ max_speedup → Stage 2：加速 TTS 音频
    ratio > max_speedup        → Stage 3：标记需要视频拉伸（Step 5/6 处理）
    """
    ratio = seg.timing_ratio
    # 输出格式继承输入扩展名：WAV（Voicebox）保持无损，MP3（OpenAI）保持原格式
    src_ext = Path(seg.tts_audio_path).suffix  # ".wav" 或 ".mp3"

    if ratio <= 1.0:
        # TTS 比原始短：补静音到原始时长，确保视频片段不被 -shortest 截断
        target_dur = seg.original_duration
        tts_dur    = seg.tts_duration
        pad_sec    = target_dur - tts_dur
        if pad_sec > 0.05:   # 超过 50ms 才补，避免无意义处理
            padded_path = str(tts_dir / f"seg_{seg.index:04d}_padded{src_ext}")
            await _pad_audio_with_silence(
                audio_path=seg.tts_audio_path,
                output_path=padded_path,
                total_duration=target_dur,   # 指定输出总时长，语义明确
                config=config,
            )
            logger.debug(
                f"  片段 #{seg.index}: TTS 较短 (ratio={ratio:.2f})，"
                f"补 {pad_sec:.2f}s 静音 → 总时长 {target_dur:.2f}s"
            )
            return padded_path
        logger.debug(f"  片段 #{seg.index}: TTS 与原始等长 (ratio={ratio:.2f})")
        return seg.tts_audio_path

    elif ratio <= max_speedup:
        # Stage 2：加速 TTS 音频以压缩到原始时长
        # atempo 值 = ratio（ratio=1.15 表示加速 15%）
        sped_path = str(tts_dir / f"seg_{seg.index:04d}_sped{src_ext}")
        await speedup_audio(
            audio_path=seg.tts_audio_path,
            output_path=sped_path,
            ratio=ratio,   # 传入实际比率
            config=config,
        )
        logger.debug(f"  片段 #{seg.index}: Stage 2 加速 x{ratio:.2f}")
        return sped_path

    else:
        # Stage 3：超出加速上限，标记需要拉伸视频
        # 视频拉伸在 Step 5 中处理（需要视频片段才能操作）
        logger.info(
            f"  片段 #{seg.index}: Stage 3 需要视频拉伸 (ratio={ratio:.2f})，"
            f"将在合成阶段处理"
        )
        return seg.tts_audio_path


async def _pad_audio_with_silence(
    audio_path: str,
    output_path: str,
    total_duration: float,
    config: dict,
) -> None:
    """
    将音频补到指定总时长（末尾追加静音）。
    用于 Stage 1（TTS 比原始短时），确保音频与原始视频段等长，
    避免 -shortest 截断视频。

    使用 whole_dur 而非 pad_dur：
      whole_dur 语义明确——"把输出补到整好 X 秒"，
      不受 ffmpeg 版本差异影响。
    """
    await run_ffmpeg([
        "-i", audio_path,
        "-af", f"apad=whole_dur={total_duration:.3f}",
        output_path,
    ], config)
