# AI FOOTBALL ANALYTICS ⚽

แพลตฟอร์มวิเคราะห์ฟุตบอลด้วย AI แบบมืออาชีพ — Dark Professional Sports Analytics Dashboard
(แนว SofaScore / Opta / TradingView แต่ใช้งานง่ายกว่า)

> **Disclaimer:** การวิเคราะห์นี้เป็นการประเมินจากสถิติและ AI เท่านั้น
> ผลการแข่งขันฟุตบอลมีความไม่แน่นอน ควรใช้วิจารณญาณและบริหารความเสี่ยงเสมอ

---

## ✨ ฟีเจอร์หลัก

- **AI Match of the Day** — AI Pick ระบุชื่อทีมชัดเจน (เช่น `MANCHESTER CITY WIN`) พร้อม Win Probability, Expected Score, Handicap / Over-Under / Corner Pick
- **Match Scanner** — ตารางสแกนทุกคู่ พร้อม filter (AI แนะนำ / ความมั่นใจสูง / Value Bet / แฮนดิแคป / เตะมุม / สูง-ต่ำ) — บนมือถือแสดงเป็น Match Cards อัตโนมัติ
- **Match Detail Page** — 8 sections: AI Summary, Team Comparison (Radar), Form Analysis, Player Impact, Corner Analysis, Odds Analysis (กราฟราคา + Steam/Sharp detection), Weather Impact, AI Explanation
- **AI Prediction Engine** — Multi-model (Statistical / Form / Odds / Player / Corner / Weather / Fatigue) รวมเป็น AI Score 0-100 พร้อม Confidence, Risk, Value, Data Quality
- **Value Bet Detection** — เทียบ AI Probability กับ Market Probability → Edge %
- **Risk Control** — Risk Score 0-100 + คำเตือนชัดเจน, ห้ามมั่นใจสูงถ้าข้อมูลไม่ครบ
- **Backtest & Accuracy** — แยกตามตลาด 1X2 / Handicap / Over-Under / Corners / Correct Score
- **Admin Panel** — จัดการ API Keys, เปิด/ปิดลีก, ปรับน้ำหนัก AI Score, Refresh Interval, Cache
- **Mobile First** — Bottom Navigation + responsive ทุกหน้า

## 🛠 Tech Stack

| Layer | เทคโนโลยี |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS v4, Recharts, Lucide Icons |
| Backend | Next.js API Routes |
| Database | PostgreSQL / Supabase + Prisma ORM |
| Cache | Redis (เตรียม env ไว้แล้ว) |
| Auth | Supabase Auth หรือ NextAuth (เตรียม env ไว้แล้ว) |

## 🚀 วิธีติดตั้ง

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. ตั้งค่า environment
cp .env.example .env
# แก้ค่าใน .env — ค่าเริ่มต้น DATA_PROVIDER=mock ใช้งานได้ทันทีโดยไม่ต้องมี API key

# 3. (ถ้าต่อฐานข้อมูลจริง) สร้างตารางจาก Prisma schema
npx prisma generate
npx prisma db push

# 4. รัน dev server
npm run dev
# เปิด http://localhost:3000
```

### Build production

```bash
npm run build && npm start
```

## 🔌 การเชื่อมต่อ API จริง

ระบบใช้ **Data Normalization Layer** (`src/lib/providers/`) — UI และ AI Engine
ไม่ผูกกับ API เจ้าใดเจ้าหนึ่ง ทุก provider ต้อง implement interface `FootballDataProvider`:

```
src/lib/providers/
├── provider.ts          # interface + fetch helper (timeout, rate-limit)
├── mock-provider.ts     # ค่าเริ่มต้น — ข้อมูลตัวอย่าง
├── api-football.ts      # API-Football / API-Sports (skeleton)
├── sportmonks.ts        # Sportmonks (skeleton)
├── football-data-org.ts # football-data.org (skeleton)
├── openweather.ts       # OpenWeather → Weather Impact Score
└── index.ts             # registry — เลือก provider จาก env DATA_PROVIDER
```

### เปิดใช้ API-Football (implement เต็มแล้ว ✅)

1. สมัครที่ https://www.api-football.com แล้วคัดลอก key จาก https://dashboard.api-football.com
2. ใส่ใน `.env`:
   ```
   DATA_PROVIDER=api-football
   API_FOOTBALL_KEY=คีย์ของคุณ
   ```
3. ตรวจสอบ key: `npm run check:api` — บอกแพลน, โควตาที่เหลือ และจำนวนคู่วันนี้
4. รีสตาร์ท dev server — ระบบจะดึงโปรแกรมแข่งวันนี้, ตารางคะแนน, ราคา, H2H, อาการบาดเจ็บ
   แล้วรัน Prediction Engine (Poisson + Form + Odds model) กับข้อมูลจริงอัตโนมัติ

การประหยัดโควตา (free tier 100 req/วัน): ทุก endpoint ผ่าน in-memory cache —
fixtures 60s, standings 6h, odds 10min (เฉพาะ `AF_ODDS_LIMIT` คู่แรก ค่าเริ่มต้น 6),
H2H 24h, injuries 6h (เฉพาะหน้า Match Detail)

ถ้า API ล้มเหลว (key ผิด/โควตาหมด) ระบบ fallback เป็นข้อมูลตัวอย่างพร้อม **banner สีแดงแจ้งชัดเจน**
— ข้อมูลตัวอย่างจะไม่มีทางถูกเข้าใจผิดว่าเป็นการวิเคราะห์จริง

ส่วน Sportmonks / football-data.org ยังเป็น skeleton (เติม mapping ในเมธอดที่ติด `TODO`)

## 🧠 AI Scoring Formula

AI Score 0-100 จากน้ำหนัก (ปรับได้ใน Admin Panel / ตาราง `ModelWeightConfig`):

| ปัจจัย | น้ำหนัก |
|---|---|
| Team Form | 20% |
| Home/Away Strength | 15% |
| Attack/Defense Stats | 15% |
| Injuries & Suspensions | 15% |
| Odds Movement | 10% |
| Head to Head | 10% |
| Corner Trend | 10% |
| Weather / Travel / Fatigue | 5% |

ระดับ AI Score: **80-100** เขียว Strong · **65-79** ฟ้า Watchlist · **50-64** ส้ม Medium · **<50** แดง Avoid

กฎความปลอดภัย: Confidence ถูก **จำกัดเพดานตาม Data Quality** — ข้อมูลไม่ครบจะไม่มีทางขึ้น HIGH/VERY HIGH (ดู `deriveConfidence` ใน `src/lib/engine/score.ts`)

## 📁 โครงสร้างโปรเจกต์

```
src/
├── app/
│   ├── page.tsx              # Dashboard หลัก
│   ├── match/[id]/page.tsx   # Match Detail (8 sections)
│   ├── admin/page.tsx        # Admin Panel
│   ├── backtest/page.tsx     # Backtest & Accuracy
│   ├── matches|live|ai-picks|handicap|over-under|corners|...  # เมนูย่อย
│   ├── api/
│   │   ├── matches/route.ts        # GET /api/matches
│   │   ├── matches/[id]/route.ts   # GET /api/matches/:id
│   │   ├── accuracy/route.ts       # GET /api/accuracy
│   │   └── alerts/route.ts         # GET /api/alerts
│   ├── loading.tsx / error.tsx / not-found.tsx
├── components/
│   ├── layout/    # Sidebar, Topbar, BottomNav (mobile)
│   ├── dashboard/ # OverviewCards, MatchOfTheDay, MatchScanner, MatchDetailPanel
│   ├── match/     # RadarCompare, OddsMovementChart, AccuracyChart
│   └── ui/        # Badge, ScoreRing, ProbBar, Stars, FormBadges, Disclaimer, Freshness
├── lib/
│   ├── types.ts        # Normalized data model
│   ├── engine/         # AI Score, Confidence, Risk, Value, Labels
│   ├── providers/      # API Integration Layer
│   └── mock/data.ts    # Mock Data (5 ลีก 10 ทีม)
prisma/schema.prisma    # 19 ตาราง (users, fixtures, odds_history, predictions, backtest_results, ...)
```

รายละเอียด component ดูที่ [docs/COMPONENTS.md](docs/COMPONENTS.md)

## 💎 Subscription Tiers

| Tier | สิทธิ์ |
|---|---|
| Free | บางลีก, ผลพื้นฐาน, จำกัดจำนวนคู่ |
| Pro | AI Score, Match Scanner เต็ม, ฟอร์มทีม |
| VIP | Handicap, Corners, Value Bet, Backtest, Odds Movement, AI Explanation เต็ม |
| Admin | ทุกอย่าง + จัดการระบบ |

Schema รองรับแล้ว (`Subscription` + enum `SubscriptionTier`) — การ gate UI ตาม tier ทำใน middleware/layout เมื่อเชื่อม Auth จริง

## ⚠️ ข้อกำหนดด้านความปลอดภัยของเนื้อหา

- ❌ ห้ามใช้คำว่า Sure Win / 100% Win / Guaranteed / Lock Bet / Fixed Match
- ✅ ทุก Prediction ต้องมี Confidence + Risk + Data Quality
- ✅ ทุก AI Pick ต้องมีเหตุผล (AI Reason)
- ✅ ข้อมูลไม่ครบต้องแสดง Missing Data และลดความมั่นใจอัตโนมัติ
- ✅ Disclaimer แสดงทุกหน้า
