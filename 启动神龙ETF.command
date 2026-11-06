#!/bin/zsh
set -euo pipefail
unsetopt BG_NICE
PROJECT_DIR="${0:A:h}"
cd "$PROJECT_DIR"
if ! command -v node >/dev/null 2>&1; then
  print '请先安装 Node.js 22.12 或更新版本。'
  read '?按回车退出…'
  exit 1
fi
if /usr/bin/curl --noproxy '*' --silent --max-time 2 http://127.0.0.1:5173/api/health | /usr/bin/grep -q '神龙ETF'; then
  open http://127.0.0.1:5173/
  print '神龙ETF已经在运行，已打开页面。'
  exit 0
fi
if [ ! -d node_modules ]; then
  npm ci
fi
print '正在启动神龙ETF… 打开 http://127.0.0.1:5173'
(sleep 3; open http://127.0.0.1:5173/) &
npm run dev
