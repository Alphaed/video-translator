"""
app_launcher.py — 桌面应用入口

双击此入口（打包后为 .app）：
  1. 后台线程启动 FastAPI 服务
  2. 等待端口就绪
  3. PyWebView 打开原生桌面窗口
  4. 窗口关闭时整个程序退出

开发调试仍用 `python main.py`，此文件仅用于桌面打包分发。
"""

import os
import sys
import socket
import threading
import time
import multiprocessing
from pathlib import Path

# ── PyInstaller 打包路径处理 ────────────────────────────────────
# 打包后资源解压在 sys._MEIPASS，开发时在脚本同级目录
BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
# 切换工作目录，确保 config.yaml / outputs / workspace 等相对路径正常
os.chdir(BASE_DIR)

# ── SSL 证书修复 ─────────────────────────────────────────────────
# 双击 .app 启动时 macOS 环境极简，SSL 握手可能挂起（联网 API 调用卡死）。
# 用 certifi 内置证书包强制覆盖，保证 DashScope / OpenAI 等 HTTPS 请求正常。
try:
    import certifi as _certifi
    _cert = _certifi.where()
    os.environ.setdefault("SSL_CERT_FILE",      _cert)
    os.environ.setdefault("REQUESTS_CA_BUNDLE", _cert)
    os.environ.setdefault("CURL_CA_BUNDLE",     _cert)
except Exception:
    pass

HOST       = "127.0.0.1"
START_PORT = 8000

APP_NAME   = "Schai"


def _find_ffmpeg() -> str:
    """
    在常见位置查找 FFmpeg 可执行文件。
    .app 双击启动时 PATH 非常有限，需要主动探测。
    """
    import shutil as _shutil
    candidates = [
        "/opt/homebrew/bin/ffmpeg",      # Homebrew Apple Silicon
        "/usr/local/bin/ffmpeg",          # Homebrew Intel
        "/opt/anaconda3/bin/ffmpeg",      # Conda base
        "/opt/miniconda3/bin/ffmpeg",     # Miniconda
        "/usr/bin/ffmpeg",                # 系统自带
        _shutil.which("ffmpeg") or "",    # PATH 中查找
    ]
    for p in candidates:
        if p and os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    return "ffmpeg"   # 兜底，由系统 PATH 解析


def _find_ffprobe() -> str:
    """同上，查找 ffprobe"""
    import shutil as _shutil
    candidates = [
        "/opt/homebrew/bin/ffprobe",
        "/usr/local/bin/ffprobe",
        "/opt/anaconda3/bin/ffprobe",
        "/opt/miniconda3/bin/ffprobe",
        "/usr/bin/ffprobe",
        _shutil.which("ffprobe") or "",
    ]
    for p in candidates:
        if p and os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    return "ffprobe"


def _setup_bundled_paths() -> None:
    """
    打包模式下的路径初始化：
      1. 在 ~/Library/Application Support/Schai/ 建立用户数据目录
      2. 若 config.yaml 不存在，从包内 config.example.yaml 复制一份
      3. 自动探测 FFmpeg 路径并写入 config.yaml
      4. 通过环境变量告知 main.py 使用用户目录的路径
    """
    is_bundled = hasattr(sys, "_MEIPASS")
    if not is_bundled:
        return   # 开发模式不做任何处理

    user_data = Path.home() / "Library" / "Application Support" / APP_NAME
    user_data.mkdir(parents=True, exist_ok=True)

    outputs_dir   = user_data / "outputs"
    workspace_dir = user_data / "workspace"
    outputs_dir.mkdir(exist_ok=True)
    workspace_dir.mkdir(exist_ok=True)

    config_path = user_data / "config.yaml"
    if not config_path.exists():
        example = Path(BASE_DIR) / "config.example.yaml"
        if example.exists():
            import shutil
            shutil.copy(str(example), str(config_path))

    # 自动探测 FFmpeg 并更新 config.yaml
    # .app 双击时 PATH 受限，必须写入绝对路径
    try:
        import yaml as _yaml
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = _yaml.safe_load(f) or {}
        cfg.setdefault("paths", {})
        cfg["paths"]["ffmpeg"]  = _find_ffmpeg()
        cfg["paths"]["ffprobe"] = _find_ffprobe()
        with open(config_path, "w", encoding="utf-8") as f:
            _yaml.dump(cfg, f, allow_unicode=True, default_flow_style=False)
    except Exception as e:
        print(f"⚠️  写入 FFmpeg 路径失败: {e}")

    # 告知 main.py 使用这些路径
    os.environ["VT_CONFIG_PATH"]   = str(config_path)
    os.environ["VT_OUTPUTS_DIR"]   = str(outputs_dir)
    os.environ["VT_WORKSPACE_DIR"] = str(workspace_dir)


def _customize_macos_titlebar() -> None:
    """
    macOS 专属：将标题栏设为透明、背景色与 App 暖白融合，
    效果类似 Claude 桌面版——红黄绿交通灯自然浮于 Header 左侧。
    必须在后台线程调用；通过 NSOperationQueue.mainQueue 派发到主线程执行。
    """
    if sys.platform != "darwin":
        return
    try:
        import AppKit
        from Foundation import NSOperationQueue

        bg = AppKit.NSColor.colorWithSRGBRed_green_blue_alpha_(
            250 / 255, 247 / 255, 242 / 255, 1.0
        )

        def _do() -> None:
            for win in AppKit.NSApp.windows():
                if isinstance(win, AppKit.NSWindow):
                    win.setTitlebarAppearsTransparent_(True)
                    win.setTitleVisibility_(1)   # NSWindowTitleHidden
                    win.setBackgroundColor_(bg)

        NSOperationQueue.mainQueue().addOperationWithBlock_(_do)
    except Exception as exc:
        print(f"[titlebar] 自定义失败（非致命）: {exc}")


# ── 加载动画 HTML（等待服务启动时显示）────────────────────────
_LOADING_HTML = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #FAF7F2;
    padding-top: 28px;   /* 为透明标题栏留出高度 */
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    height: 100vh;
    font-family: -apple-system, "PingFang SC", sans-serif;
    color: #3D3A36;
  }
  .logo { font-size: 48px; margin-bottom: 20px; }
  .title { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
  .sub { font-size: 13px; color: #9B978F; margin-bottom: 40px; }
  .dots { display: flex; gap: 8px; }
  .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #E66A3D;
    animation: bounce 1.2s infinite ease-in-out;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%           { transform: scale(1.0); opacity: 1.0; }
  }
</style>
</head>
<body>
  <div class="logo" style="font-size:40px;margin-bottom:20px">🎬</div>
  <div class="title">视频翻译工具</div>
  <div class="sub">正在启动服务，请稍候…</div>
  <div class="dots">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
</body>
</html>
"""


def _find_free_port() -> int:
    """从 START_PORT 开始找一个空闲端口，最多尝试 20 个"""
    for port in range(START_PORT, START_PORT + 20):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind((HOST, port))
                return port
        except OSError:
            continue
    raise RuntimeError("端口 8000~8019 均被占用，请关闭占用程序后重试")


def _wait_for_port(port: int, timeout: float = 30.0) -> bool:
    """轮询直到端口可连接，超时返回 False"""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((HOST, port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.15)
    return False


def _run_server(port: int) -> None:
    """在后台线程中启动 FastAPI + uvicorn（daemon 线程，窗口关闭后自动退出）"""
    import uvicorn
    import main as app_module          # 复用现有 main.py 中的 FastAPI app

    uvicorn.run(
        app_module.app,
        host=HOST,
        port=port,
        log_level="warning",           # 只输出警告以上，保持终端干净
        access_log=False,
    )


class JsApi:
    """
    暴露给前端的 Python API（通过 window.pywebview.api 调用）。
    主要用于在 WKWebView 中触发原生文件保存对话框，
    因为 WKWebView 不支持 <a download> 属性。
    """

    def __init__(self) -> None:
        self.base_url: str = ""

    def download(self, rel_path: str, filename: str) -> bool:
        """
        弹出原生 NSSavePanel，用户选择路径后从后端下载文件并保存。
        rel_path: 相对路径，如 /tasks/xxx/download/video
        filename: 建议文件名
        """
        try:
            import threading
            import urllib.request
            import AppKit
            from Foundation import NSOperationQueue

            chosen: list = [None]
            evt = threading.Event()

            def _show_panel() -> None:
                panel = AppKit.NSSavePanel.savePanel()
                panel.setNameFieldStringValue_(filename)
                if panel.runModal() == AppKit.NSModalResponseOK:
                    chosen[0] = str(panel.URL().path())
                evt.set()

            NSOperationQueue.mainQueue().addOperationWithBlock_(_show_panel)
            evt.wait(timeout=120)   # 等待用户操作，最多 2 分钟

            if chosen[0]:
                urllib.request.urlretrieve(
                    f"{self.base_url}{rel_path}", chosen[0]
                )
                return True
        except Exception as exc:
            print(f"[download] 保存失败: {exc}")
        return False


def _error_window(message: str) -> None:
    """显示一个简单错误弹窗然后退出"""
    import webview
    webview.create_window(
        "启动失败",
        html=f"""
        <body style="font-family:-apple-system,'PingFang SC',sans-serif;
                     background:#FAF7F2;display:flex;align-items:center;
                     justify-content:center;height:100vh;margin:0">
          <div style="text-align:center;color:#3D3A36">
            <div style="font-size:40px;margin-bottom:16px">⚠️</div>
            <div style="font-size:16px;font-weight:600;margin-bottom:8px">启动失败</div>
            <div style="font-size:13px;color:#9B978F">{message}</div>
          </div>
        </body>
        """,
        width=420, height=280,
        resizable=False,
    )
    webview.start()


def main() -> None:
    import webview

    # ── 0. 初始化打包版路径（必须在 import main 之前）──────
    _setup_bundled_paths()

    # ── 1. 找空闲端口 ──────────────────────────────────────
    try:
        port = _find_free_port()
    except RuntimeError as e:
        _error_window(str(e))
        return

    # ── 1.5 初始化 JS API（需要 port 才能构造 base_url）──────
    js_api = JsApi()
    js_api.base_url = f"http://{HOST}:{port}"

    # ── 2. 先展示加载窗口 ──────────────────────────────────
    window = webview.create_window(
        title="Schai",
        html=_LOADING_HTML,
        width=1280,
        height=820,
        min_size=(960, 640),
        text_select=False,
        zoomable=False,
        background_color='#FAF7F2',   # 防止加载时白屏闪烁
        js_api=js_api,                # 暴露原生下载 API 给前端
    )

    def on_shown():
        """窗口显示后：启动服务 → 等待就绪 → 跳转到真实 URL"""
        # macOS 透明标题栏（立即排队到主线程执行）
        _customize_macos_titlebar()

        # 启动 FastAPI 后台线程
        t = threading.Thread(target=_run_server, args=(port,), daemon=True)
        t.start()

        # 等待端口就绪（最多 30 秒）
        if _wait_for_port(port, timeout=30.0):
            window.load_url(f"http://{HOST}:{port}/ui")
        else:
            window.load_html("""
            <body style="font-family:-apple-system,sans-serif;background:#FAF7F2;
                         display:flex;align-items:center;justify-content:center;
                         height:100vh;margin:0;color:#3D3A36;text-align:center">
              <div>
                <div style="font-size:36px;margin-bottom:12px">⏱️</div>
                <div style="font-size:15px;font-weight:600">服务启动超时</div>
                <div style="font-size:12px;color:#9B978F;margin-top:6px">请关闭重新打开</div>
              </div>
            </body>
            """)

    # ── 3. 启动 PyWebView 主循环 ───────────────────────────
    # on_shown 在子线程中执行，不阻塞 UI
    webview.start(on_shown, debug=False)


if __name__ == "__main__":
    # PyInstaller 在 Windows 上需要此行防止子进程递归启动
    multiprocessing.freeze_support()
    main()
