# rthook_jaraco.py — 运行时钩子（在所有模块导入前执行）

import os

# OpenSSL 3.0 打包环境下 legacy provider 无法加载，禁用它
os.environ.setdefault("CRYPTOGRAPHY_OPENSSL_NO_LEGACY", "1")
# pkg_resources 启动时会从 jaraco.text 导入几个工具函数。
# jaraco 是命名空间包，PyInstaller 无法正确打包，
# 此钩子在 pkg_resources 加载前注入带真实实现的桩模块。

import sys
from types import ModuleType


# ── jaraco.text 桩 ────────────────────────────────────────────
# pkg_resources 用到的函数：drop_comment / join_continuation / yield_lines

def _drop_comment(line):
    """去掉行内 # 注释（pkg_resources 用来解析 requires.txt）"""
    return line.partition('#')[0]


def _join_continuation(lines):
    """合并续行（以 \\ 结尾的行）"""
    lines = iter(lines)
    for line in lines:
        while line.endswith('\\'):
            line = line[:-1] + next(lines, '')
        yield line


def _yield_lines(strs):
    """逐行 yield，跳过空行和注释行"""
    if isinstance(strs, str):
        strs = strs.splitlines()
    for s in strs:
        s = s.strip()
        if s and not s.startswith('#'):
            yield s


def _stub_package(name: str) -> ModuleType:
    mod = ModuleType(name)
    mod.__path__ = []
    sys.modules[name] = mod
    return mod


# 注入 jaraco 命名空间
if "jaraco" not in sys.modules:
    _stub_package("jaraco")

# 注入 jaraco.text（含真实函数）
if "jaraco.text" not in sys.modules:
    jt = ModuleType("jaraco.text")
    jt.__path__ = []
    jt.drop_comment      = _drop_comment
    jt.join_continuation = _join_continuation
    jt.yield_lines       = _yield_lines
    sys.modules["jaraco.text"] = jt

# 注入其他 jaraco 子包（空桩即可）
for _name in ("jaraco.functools", "jaraco.context"):
    if _name not in sys.modules:
        _stub_package(_name)
