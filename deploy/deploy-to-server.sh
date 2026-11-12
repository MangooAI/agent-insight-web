#!/usr/bin/env bash
# Agent Insight 官网 —— 本地一键上传到云服务器（Ubuntu/Debian + nginx）
#
# 用法：
#   1. 修改下面 4 个变量；
#   2. 在项目根目录执行：bash deploy/deploy-to-server.sh
#   3. 首次部署后再按 README 启用 nginx 站点配置。
set -euo pipefail

SERVER="root@YOUR_SERVER_IP"          # 改成 user@公网IP
SSH_PORT="22"
REMOTE_DIR="/var/www/agent-insight"   # 服务器上的站点目录
PUBLIC_BASE="http://YOUR_SERVER_IP"   # 仅用于部署后自检，可留空

# 安全保护：防止 REMOTE_DIR 配错导致误删
case "$REMOTE_DIR" in
  */agent-insight) ;;
  *) echo "REMOTE_DIR 必须以 /agent-insight 结尾，当前：$REMOTE_DIR" >&2; exit 1 ;;
esac

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$PROJECT_ROOT/dist/site"
TARBALL="$PROJECT_ROOT/dist/agent-insight-site.tar.gz"

if [ ! -f "$SITE_DIR/index.html" ]; then
  echo "找不到 $SITE_DIR/index.html，请先在项目根目录执行打包步骤。" >&2
  exit 1
fi

echo "[1/4] 打包 $SITE_DIR"
tar -czf "$TARBALL" -C "$SITE_DIR" .

echo "[2/4] 上传到 $SERVER:$REMOTE_DIR"
scp -P "$SSH_PORT" "$TARBALL" "$SERVER:/tmp/agent-insight-site.tar.gz"

echo "[3/4] 解压并设置权限"
ssh -p "$SSH_PORT" -t "$SERVER" "
  set -e
  sudo mkdir -p '$REMOTE_DIR'
  sudo find '$REMOTE_DIR' -mindepth 1 -delete
  sudo tar -xzf /tmp/agent-insight-site.tar.gz -C '$REMOTE_DIR'
  sudo chown -R www-data:www-data '$REMOTE_DIR'
  sudo find '$REMOTE_DIR' -type d -exec chmod 755 {} \;
  sudo find '$REMOTE_DIR' -type f -exec chmod 644 {} \;
  rm -f /tmp/agent-insight-site.tar.gz
"

echo "[4/4] 校验 nginx 配置并重载"
ssh -p "$SSH_PORT" -t "$SERVER" "sudo nginx -t && sudo systemctl reload nginx"

if [ -n "$PUBLIC_BASE" ]; then
  echo "自检：$PUBLIC_BASE/"
  curl -sS -o /dev/null -w "HTTP %{http_code}\n" "$PUBLIC_BASE/" || true
fi

echo "完成。"
