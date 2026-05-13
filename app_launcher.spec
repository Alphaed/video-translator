# -*- mode: python ; coding: utf-8 -*-
# app_launcher.spec — Schai.app PyInstaller 打包配置
#
# 使用方式（在项目根目录，conda base 环境下）：
#   pyinstaller app_launcher.spec --noconfirm

from PyInstaller.utils.hooks import (
    collect_all,
    collect_submodules,
    collect_data_files,
)

block_cipher = None

# ── 收集有动态子模块的大型包 ──────────────────────────────────
torch_datas,      torch_bins,      torch_hidden      = collect_all("torch")
demucs_datas,     demucs_bins,     demucs_hidden     = collect_all("demucs")
webview_datas,    webview_bins,    webview_hidden     = collect_all("webview")
cv2_datas,        cv2_bins,        cv2_hidden         = collect_all("cv2")
jaraco_datas,     jaraco_bins,     jaraco_hidden      = collect_all("jaraco")
dashscope_datas,  dashscope_bins,  dashscope_hidden   = collect_all("dashscope")
openai_datas,     openai_bins,     openai_hidden      = collect_all("openai")
torchaudio_datas, torchaudio_bins, torchaudio_hidden  = collect_all("torchaudio") if True else ([], [], [])

# ── 需要随包携带的数据文件 ─────────────────────────────────────
datas = [
    # 前端静态文件（挂载为 /ui）
    ("frontend",            "frontend"),
    # 配置模板（首次启动时复制到用户数据目录）
    ("config.example.yaml", "."),
]
datas += torch_datas
datas += demucs_datas
datas += webview_datas
datas += cv2_datas
datas += jaraco_datas
datas += dashscope_datas
datas += openai_datas

# ── 需要显式声明的隐式导入 ────────────────────────────────────
hiddenimports = [
    # ── FastAPI / uvicorn 生态 ──────────────────────────────
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "fastapi",
    "fastapi.staticfiles",
    "fastapi.responses",
    "starlette",
    "starlette.routing",
    "starlette.staticfiles",
    "anyio",
    "anyio._backends._asyncio",
    "multipart",
    "python_multipart",
    # ── 数据验证 ────────────────────────────────────────────
    "pydantic",
    "pydantic_settings",
    # ── AI / API SDK ────────────────────────────────────────
    "openai",
    "dashscope",
    # ── 音视频 ──────────────────────────────────────────────
    "pydub",
    "soundfile",
    # ── HTTP ────────────────────────────────────────────────
    "httpx",
    # ── 工具 ────────────────────────────────────────────────
    "yaml",
    "aiofiles",
    "tqdm",
    # ── pywebview macOS 原生框架（pyobjc）──────────────────
    "webview",
    "webview.platforms.cocoa",
    "objc",
    "AppKit",
    "Foundation",
    "WebKit",
    "Cocoa",
    "CoreFoundation",
    # ── pkg_resources / setuptools ──────────────────────────
    # (jaraco 通过 rthook_jaraco.py 运行时注入，不在这里声明)
]
hiddenimports += torch_hidden
hiddenimports += demucs_hidden
hiddenimports += webview_hidden
hiddenimports += cv2_hidden
hiddenimports += jaraco_hidden
hiddenimports += dashscope_hidden
hiddenimports += openai_hidden

a = Analysis(
    ["app_launcher.py"],
    pathex=["."],
    binaries=torch_bins + demucs_bins + webview_bins + cv2_bins + jaraco_bins + dashscope_bins + openai_bins,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=["rthook_jaraco.py"],
    excludes=[
        # 排除不需要的包，减小体积
        "tkinter",
        "matplotlib",
        "notebook",
        "IPython",
        "pytest",
        # pywebview 在 macOS 用原生 WebKit，不需要 Qt
        "PyQt5",
        "PySide6",
        "PyQt6",
        "PySide2",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="Schai",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon="AppIcon.icns",
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="Schai",
)

app = BUNDLE(
    coll,
    name="Schai.app",
    icon="AppIcon.icns",
    bundle_identifier="com.schai.videotranslator",
    info_plist={
        "CFBundleDisplayName": "Schai",
        "CFBundleName": "Schai",
        "CFBundleShortVersionString": "1.0.0",
        "CFBundleVersion": "1",
        "NSHighResolutionCapable": True,
        "NSAppSleepDisabled": True,
        "com.apple.security.files.user-selected.read-write": True,
    },
)
