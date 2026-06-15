# Component Documentation

ทุก component เป็น TypeScript + Tailwind ใช้ design tokens จาก `globals.css`
(สีทั้งหมดอ้างผ่าน CSS variables เช่น `var(--neon-green)`)

## Layout (`src/components/layout/`)

| Component | Props | หน้าที่ |
|---|---|---|
| `Sidebar` | — | เมนูซ้าย (desktop) + การ์ด AI Accuracy + การ์ด Premium ตาม reference |
| `Topbar` | `title: string` | หัวเพจ: ชื่อหน้า, วันที่ไทย, Data Freshness, ค้นหา, กระดิ่งแจ้งเตือน, ป้าย VIP |
| `BottomNav` | — | Navigation ล่าง 5 ปุ่มบนมือถือ (Home / Matches / Live / Predictions / Account) |

## UI Primitives (`src/components/ui/`)

| Component | Props | หน้าที่ |
|---|---|---|
| `Badge` | `tone: Tone`, `children` | ป้ายสถานะ — โทนสีจาก `engine/labels.ts` เพื่อให้ทุกหน้าใช้สีตรงกัน |
| `ScoreRing` | `score: 0-100`, `size?`, `label?` | วงแหวน AI Score / Data Quality / Accuracy เปลี่ยนสีตาม tier อัตโนมัติ |
| `ProbBar` | `home, draw, away: number` | แถบ Win Probability เขียว/ฟ้า/เทา พร้อม aria-label ภาษาไทย |
| `Stars` | `count`, `max?` | ดาว Value Rating |
| `FormBadges` | `form: ("W"\|"D"\|"L")[]` | ป้ายฟอร์ม 5 นัด |
| `TeamLogo` | `teamId, shortName, size?` | โลโก้ทีม (placeholder วงกลม+อักษรย่อ จนกว่า API จะส่งรูปจริง) |
| `Freshness` | — | "อัปเดตล่าสุด HH:MM:SS" refresh ทุก 30 วิ (client) |
| `Disclaimer` | — | ข้อความ Legal & Safety ไทย+อังกฤษ — **ต้องอยู่ทุกหน้า** |
| `EmptyPage` | `title, message` | Empty state สำหรับหน้าที่รอข้อมูลจริงจาก API |

## Dashboard (`src/components/dashboard/`)

| Component | Props | หน้าที่ |
|---|---|---|
| `OverviewCards` | `stats: OverviewStats` | การ์ดสรุป 6 ใบ (คู่ทั้งหมด / AI แนะนำ / มั่นใจสูง / Value Bet / เสี่ยงสูง / Accuracy) |
| `MatchOfTheDay` | `fixture: Fixture` | การ์ดใหญ่ AI Match of the Day — AI Pick ชื่อทีมตัวใหญ่, Win Probability, AI Score ring, Confidence/Risk/Value, แถบ 6 ค่า, AI Reason, Key Players |
| `MatchScanner` | `fixtures: Fixture[]` | ตารางสแกน (desktop) / Match Cards (mobile) + filter tabs — Prediction แสดง **ชื่อทีมเสมอ** ห้าม Home/Away Win |
| `MatchDetailPanel` | `fixture: Fixture` | Panel ขวา: tabs สถิติ/ฟอร์ม/H2H/ผู้เล่น/ข่าวสาร + Weather + AI Alert |
| `ScannerPage` | `title, description?, fixtures` | Layout ใช้ร่วมของหน้า list (แมตช์วันนี้, AI แนะนำ, แฮนดิแคป, สูง/ต่ำ, เตะมุม) |

## Match Charts (`src/components/match/`) — ทั้งหมดเป็น client components (Recharts)

| Component | Props | หน้าที่ |
|---|---|---|
| `RadarCompare` | `home, away: Team` | Radar 9 แกน: Attack, Defense, Possession, Shots, Corners, Fitness, Form, Set Piece, Squad Depth |
| `OddsMovementChart` | `history: OddsPoint[]` | กราฟเส้นราคาบ้าน/เสมอ/เยือนตามเวลา |
| `AccuracyChart` | `data: {date, accuracy}[]` | กราฟแท่ง accuracy รายวัน |

## Engine (`src/lib/engine/`)

- `score.ts` — `computeAiScore(factors, weights)` ตามสูตรน้ำหนัก 8 ปัจจัย, `deriveConfidence` (จำกัดเพดานตาม Data Quality), `deriveRiskLevel`, `deriveValue` (Edge % → rating), `deriveStatus`
- `labels.ts` — mapping สี/ป้ายกลางของ AI Score tier, Confidence, Risk, Value, Status

## กฎการใช้งานสำคัญ

1. **ห้าม** แสดง "Home Win/Away Win" — ใช้ `prediction.pickTeamName` เสมอ
2. ทุกค่า % ต้องมี label บอกว่าเป็นของอะไร
3. ข้อมูลที่ไม่มีให้แสดง Badge `MISSING DATA` (โทน orange)
4. สีทุกสถานะต้องมาจาก `engine/labels.ts` เท่านั้น ห้าม hard-code
