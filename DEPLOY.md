# 🚀 คู่มือขึ้นเว็บไซต์ (Deploy) — BALLAI365

คู่มือนี้พาขึ้นเว็บจริงทีละขั้น สำหรับคนที่จดโดเมนแล้ว

---

## ภาพรวม: ทำไมต้องใช้ VPS (ไม่ใช่ Vercel)

ระบบนี้ **เขียนไฟล์ลงดิสก์** (ledger ความแม่น, ผลวิเคราะห์ Claude, settings) และมี
**งานตามเวลา 2 ตัว** (รีเฟรช 12:00 + prekick ทุก 15 นาที) จึงต้องใช้
**VPS (เซิร์ฟเวอร์จริงที่มีดิสก์ถาวร)** — ไม่ใช่ serverless แบบ Vercel/Netlify
ที่ไฟล์จะหายและรัน cron ไม่ได้

**แนะนำ:** DigitalOcean / Hetzner / Vultr — เครื่องเล็กสุด (1 vCPU, 1GB RAM, ~$5-6/เดือน) พอ

---

## ⚠️ ขั้นที่ 0 — ความปลอดภัยก่อนขึ้น (สำคัญสุด ห้ามข้าม)

1. **เปลี่ยน (rotate) API keys ทั้ง 3 ตัวใหม่** เพราะตัวเดิมเคยถูกวางในแชต/ที่อื่น:
   - API-Football → https://dashboard.api-football.com
   - OpenWeather → https://home.openweathermap.org/api_keys
   - Anthropic → https://console.anthropic.com (ลบตัวเก่า สร้างใหม่)

2. **สร้าง secret สุ่มยาว** 2 ตัว (รันบนเครื่องไหนก็ได้):
   ```bash
   openssl rand -hex 32   # ใช้เป็น ADMIN_SECRET
   openssl rand -hex 32   # ใช้เป็น CRON_SECRET
   ```

3. ยืนยันว่า `.env` และ `.cache/` **ไม่ถูก push ขึ้น git** (มีใน .gitignore แล้ว)

---

## ขั้นที่ 1 — เตรียม VPS

```bash
# SSH เข้าเครื่อง (แทน IP ด้วยของจริง)
ssh root@<IP-ของ-VPS>

# ติดตั้ง Node.js 20 (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git

# ตรวจ
node -v   # ควรเป็น v20+
```

---

## ขั้นที่ 2 — เอาโค้ดขึ้นเครื่อง

**ทางเลือก A: ผ่าน git** (ถ้า push โค้ดขึ้น GitHub แบบ private)
```bash
git clone https://github.com/<คุณ>/ai-football-analytics.git
cd ai-football-analytics
```

**ทางเลือก B: อัปโหลดตรง** (จากเครื่องคุณ — ไม่เอา node_modules/.next/.cache)
```bash
rsync -av --exclude node_modules --exclude .next --exclude .cache \
  ./ai-football-analytics/ root@<IP>:/root/ai-football-analytics/
```

---

## ขั้นที่ 3 — ตั้งค่า env

สร้างไฟล์ `.env` บน VPS:
```bash
cd /root/ai-football-analytics
nano .env
```
ใส่ (ใช้ key ตัวใหม่ที่ rotate แล้ว):
```
DATA_PROVIDER=api-football
API_FOOTBALL_KEY=<ตัวใหม่>
OPENWEATHER_KEY=<ตัวใหม่>
ANTHROPIC_API_KEY=<ตัวใหม่>
ADMIN_SECRET=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32>
NEXT_PUBLIC_SITE_URL=https://<โดเมนคุณ>
CLAUDE_ANALYSIS_LIMIT=10
ENABLE_WEB_SEARCH=
NODE_ENV=production
```
> `ENABLE_WEB_SEARCH=` เว้นว่าง = ปิด (ประหยัด) · ใส่ `1` ถ้าอยากเปิดทรรศนะเว็บ

---

## ขั้นที่ 4 — Build + รันด้วย pm2 (วิธีที่ตรงไปตรงมา)

```bash
npm ci                    # ติดตั้ง dependencies
npm run build             # build production
npm i -g pm2              # process manager (รันตลอด + restart auto)

# รัน app ที่ port 3000
pm2 start "npm start" --name ballai365
pm2 save                  # จำ process ไว้
pm2 startup               # ให้รันอัตโนมัติเมื่อ reboot (ทำตามที่มันพิมพ์)
```
ตอนนี้ app รันที่ `http://127.0.0.1:3000` (ยังไม่เปิดสู่ภายนอก — รอ HTTPS ขั้นต่อไป)

---

## ขั้นที่ 5 — โดเมน + HTTPS (ใช้ Caddy = ออก SSL ฟรีอัตโนมัติ)

**5.1 ตั้ง DNS** (ที่ผู้ให้บริการโดเมน):
- เพิ่ม A record: `@` → `<IP-ของ-VPS>`
- เพิ่ม A record: `www` → `<IP-ของ-VPS>`
- รอ DNS propagate (~5-30 นาที)

**5.2 ติดตั้ง Caddy** (reverse proxy + HTTPS อัตโนมัติ):
```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

**5.3 ตั้ง Caddyfile:**
```bash
nano /etc/caddy/Caddyfile
```
ใส่ (แทนโดเมนจริง):
```
โดเมนคุณ.com, www.โดเมนคุณ.com {
    reverse_proxy 127.0.0.1:3000
}
```
แล้ว:
```bash
systemctl reload caddy
```
✅ Caddy จะออก SSL (Let's Encrypt) ให้อัตโนมัติ — เปิด `https://โดเมนคุณ.com` ได้เลย

---

## ขั้นที่ 6 — ตั้งงานตามเวลา (cron) แทน launchd

บนเครื่อง Mac ใช้ launchd · บน VPS (Linux) ใช้ **crontab**

```bash
crontab -e
```
ใส่ (แทน CRON_SECRET ด้วยค่าจริงใน .env):
```cron
# รีเฟรชข้อมูล + วิเคราะห์คู่หน้าหลัก — ทุกวัน 12:00 (เวลาไทย)
0 12 * * * curl -s -m 180 -H "Authorization: Bearer <CRON_SECRET>" http://127.0.0.1:3000/api/cron/refresh >> /var/log/ballai-refresh.log 2>&1

# prekick — วิเคราะห์รอบสุดท้ายก่อนเตะ ทุก 15 นาที
*/15 * * * * curl -s -m 300 -H "Authorization: Bearer <CRON_SECRET>" http://127.0.0.1:3000/api/cron/prekick >> /var/log/ballai-prekick.log 2>&1
```
> ⚠️ ตั้ง timezone ของ VPS เป็นไทยก่อน: `timedatectl set-timezone Asia/Bangkok`

---

## ขั้นที่ 7 — ตรวจหลังขึ้น (Checklist)

- [ ] เปิด `https://โดเมนคุณ.com` ได้ + มีกุญแจ SSL เขียว
- [ ] หน้าหลักโหลดมีคู่บอล (API ทำงาน)
- [ ] เปิดหน้าแมตช์ดู AI วิเคราะห์ขึ้นครบ
- [ ] รอ/ยิง cron ลองดูว่า `/api/cron/refresh` คืน 200
- [ ] `pm2 logs ballai365` ไม่มี error แดง
- [ ] `.env` สิทธิ์ปลอดภัย: `chmod 600 .env`
- [ ] ทดสอบ reboot เครื่อง → app กลับมาเอง (`pm2 startup` ทำงาน)

---

## การอัปเดตเว็บภายหลัง (deploy รอบใหม่)

```bash
cd /root/ai-football-analytics
git pull                  # หรือ rsync ไฟล์ใหม่
npm ci && npm run build
pm2 restart ballai365
```
> ข้อมูลใน `.cache/` (ledger/ความแม่น) **ไม่หาย** เพราะอยู่บนดิสก์ถาวร

---

## ภาคผนวก: ถ้าอยากใช้ Docker แทน pm2

Docker เหมาะถ้าอยากย้ายเครื่องง่าย/กันพังจากสภาพแวดล้อม แต่ตั้งซับซ้อนกว่าเล็กน้อย
ต้องมี: `Dockerfile` + `docker-compose.yml` (mount `.cache/` เป็น volume ถาวร) +
cron บน host เรียก endpoint เดิม — บอกได้ถ้าจะใช้ทางนี้ ผมสร้างไฟล์ให้

---

## ต้นทุนโดยประมาณต่อเดือน

| รายการ | ค่าใช้จ่าย |
|---|---|
| VPS (1GB) | ~$5-6 (~฿200) |
| โดเมน | ~฿300-500/ปี (จ่ายแล้ว) |
| Claude API | ~฿2,000 (10 คู่/วัน, web search ปิด) |
| API-Football | ตามแพ็กเกจที่สมัคร |
| OpenWeather | ฟรี (tier ฟรีพอ) |

---

## สรุป 7 ขั้น

1. Rotate API keys + สร้าง secret
2. เตรียม VPS + Node 20
3. เอาโค้ดขึ้น
4. ตั้ง `.env`
5. Build + pm2
6. DNS + Caddy (HTTPS)
7. crontab + ตรวจ checklist

เปิด `https://โดเมนคุณ.com` ได้เลย 🎉
