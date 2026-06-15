#!/bin/bash
# Pre-kick final analysis — launchd เรียกทุก 15 นาที
# คู่ที่จะเตะภายใน 60 นาทีจะถูก Claude วิเคราะห์รอบสุดท้าย (ไม่มีคู่ = จบทันที ฟรี)

PORTS=(3001 3000)
LOG="$HOME/Library/Logs/ai-football-prekick.log"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
CRON_SECRET=$(grep -m1 "^CRON_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d= -f2)

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }

for port in "${PORTS[@]}"; do
  result=$(curl -s -m 300 -H "Authorization: Bearer ${CRON_SECRET}" "http://localhost:${port}/api/cron/prekick" 2>/dev/null)
  if [ -n "$result" ]; then
    # ลงบันทึกเฉพาะรอบที่มีงานจริง (finalize หรือรอไลน์อัพ) — กัน log บวมจากรอบว่าง
    if ! echo "$result" | grep -q '"finalized":\[\],"waiting":\[\]'; then
      echo "$(timestamp) [port ${port}] ${result}" >> "$LOG"
    fi
    exit 0
  fi
done
echo "$(timestamp) ERROR: no server responding" >> "$LOG"
exit 1
