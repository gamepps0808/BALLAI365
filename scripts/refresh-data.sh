#!/bin/bash
# Daily data refresh — called by launchd at 12:00 น. (Asia/Bangkok local time).
# Tries the dev/prod ports the app commonly runs on; first one that answers wins.

PORTS=(3001 3000)
LOG="$HOME/Library/Logs/ai-football-refresh.log"
# อ่าน CRON_SECRET จาก .env ของโปรเจกต์ (endpoint ปิดด้วย secret แล้ว)
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
CRON_SECRET=$(grep -m1 "^CRON_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d= -f2)

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }

for port in "${PORTS[@]}"; do
  result=$(curl -s -m 180 -H "Authorization: Bearer ${CRON_SECRET}" "http://localhost:${port}/api/cron/refresh" 2>/dev/null)
  if [ -n "$result" ]; then
    echo "$(timestamp) [port ${port}] ${result}" >> "$LOG"
    exit 0
  fi
done

echo "$(timestamp) ERROR: no server responding on ports ${PORTS[*]} — เปิด npm run dev ค้างไว้เพื่อให้รีเฟรชอัตโนมัติทำงาน" >> "$LOG"
exit 1
