#!/bin/bash
# clean.sh — 清理本地运行数据
# 用法：
#   bash clean.sh          # 交互模式（逐项确认）
#   bash clean.sh -a       # 一键全清（无需确认）
#   bash clean.sh -o       # 只清 outputs
#   bash clean.sh -w       # 只清 workspace

set -e
cd "$(dirname "$0")"

RED='\033[0;31m'
YLW='\033[0;33m'
GRN='\033[0;32m'
DIM='\033[0;90m'
NC='\033[0m'

FORCE=0
ONLY_OUTPUTS=0
ONLY_WORKSPACE=0

for arg in "$@"; do
  case $arg in
    -a) FORCE=1 ;;
    -o) ONLY_OUTPUTS=1 ;;
    -w) ONLY_WORKSPACE=1 ;;
  esac
done

echo ""
echo "🧹 Video Translator — 数据清理"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 统计当前占用 ──────────────────────────────────────────────
WS_SIZE=$(du -sh workspace/ 2>/dev/null | cut -f1 || echo "0")
OUT_SIZE=$(du -sh outputs/  2>/dev/null | cut -f1 || echo "0")
PY_COUNT=$(find . -name "__pycache__" -o -name "*.pyc" 2>/dev/null | wc -l | tr -d ' ')

echo -e "  workspace/   ${YLW}${WS_SIZE}${NC}   中间处理文件"
echo -e "  outputs/     ${YLW}${OUT_SIZE}${NC}   任务输出结果"
echo -e "  __pycache__  ${DIM}${PY_COUNT} 个文件${NC}  Python 编译缓存"
echo ""

# ── 确认函数 ──────────────────────────────────────────────────
confirm() {
  [ $FORCE -eq 1 ] && return 0
  printf "  删除 $1？[y/N] "
  read -r ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

CLEANED=0

# ── workspace ────────────────────────────────────────────────
if [ $ONLY_OUTPUTS -eq 0 ]; then
  if [ -d workspace ] && [ "$(ls -A workspace 2>/dev/null)" ]; then
    if confirm "workspace/ (${WS_SIZE} 中间文件)"; then
      rm -rf workspace/*/
      echo -e "  ${GRN}✓${NC} workspace/ 已清空"
      CLEANED=1
    fi
  else
    echo -e "  ${DIM}workspace/ 已是空的${NC}"
  fi
fi

# ── outputs ──────────────────────────────────────────────────
if [ $ONLY_WORKSPACE -eq 0 ]; then
  if [ -d outputs ] && [ "$(ls -A outputs 2>/dev/null)" ]; then
    if confirm "outputs/ (${OUT_SIZE} 输出结果)"; then
      rm -rf outputs/*/
      echo -e "  ${GRN}✓${NC} outputs/ 已清空"
      CLEANED=1
    fi
  else
    echo -e "  ${DIM}outputs/ 已是空的${NC}"
  fi
fi

# ── __pycache__ ───────────────────────────────────────────────
if [ $ONLY_OUTPUTS -eq 0 ] && [ $ONLY_WORKSPACE -eq 0 ]; then
  if [ "$PY_COUNT" -gt 0 ]; then
    if confirm "__pycache__ 和 .pyc 文件 (${PY_COUNT} 个)"; then
      find . -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
      find . -name "*.pyc" -delete 2>/dev/null || true
      echo -e "  ${GRN}✓${NC} Python 缓存已清除"
      CLEANED=1
    fi
  fi
fi

echo ""
if [ $CLEANED -eq 1 ]; then
  echo -e "${GRN}✅ 清理完成${NC}"
else
  echo -e "${DIM}未做任何清理${NC}"
fi
echo ""
