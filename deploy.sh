#!/bin/bash
# 部署脚本：将游戏更新到 surge.sh 公开网站
# 网站：https://jjk-cursed-clash-v3.surge.sh

set -e

echo "=========================================="
echo "  咒术回战：咒力交织 - 部署到 surge.sh"
echo "=========================================="
echo ""

cd /workspace

# 语法检查
echo "[1/3] 语法检查..."
for f in js/*.js; do
  node --check "$f" || { echo "语法错误: $f"; exit 1; }
done
echo "  所有 JS 文件语法检查通过"

# 部署到 surge.sh
echo "[2/3] 部署到 surge.sh..."
node -e "
const { spawn } = require('child_process');
const surge = spawn('npx', ['surge', '.', 'jjk-cursed-clash-v3.surge.sh'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
surge.stdout.on('data', (d) => { output += d.toString(); });
surge.stderr.on('data', (d) => { output += d.toString(); });

surge.on('close', (code) => {
  if (code === 0) {
    console.log('  部署成功！');
  } else {
    console.error('  部署失败:', code);
    console.error(output);
    process.exit(1);
  }
});

setTimeout(() => { surge.stdin.write('deploy@jjk-game.com\n'); }, 1000);
setTimeout(() => { surge.stdin.write('JjkGame2024!\n'); }, 2000);
setTimeout(() => { surge.stdin.end(); }, 5000);
"

# 验证部署
echo "[3/3] 验证部署..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://jjk-cursed-clash-v3.surge.sh/")
if [ "$HTTP_CODE" = "200" ]; then
  echo "  网站可正常访问 (HTTP 200)"
else
  echo "  警告：网站返回 HTTP $HTTP_CODE"
fi

echo ""
echo "=========================================="
echo "  部署完成！"
echo "  网址：https://jjk-cursed-clash-v3.surge.sh"
echo "=========================================="
