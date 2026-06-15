import {
  ConfidenceLevel,
  RiskLevel,
  ValueRating,
  EndpointStatus,
  AfOddsBookmaker,
  PREFERRED_BOOKMAKERS,
} from "@/types/football";

/**
 * Scoring & pick rules — implemented exactly per spec:
 *
 * AI Score (0-100, only from data that actually exists):
 *   Team Statistics 25 | Form 20 | H2H 15 | Odds 15 | Predictions 15 | Lineups/Injuries 10
 *
 * Data Quality: start 100, deduct per missing block:
 *   teamStats -25 | fixtureStats -15 | h2h -10 | odds -20 | predictions -20 | lineups -5 | injuries -5
 *
 * Confidence: HIGH = DQ>=80 & AI>=70 | MEDIUM = DQ>=50 & AI>=50 | LOW otherwise
 * Risk:       HIGH = DQ<50 | MEDIUM = DQ 50-79 | LOW = DQ>=80
 * Value:      edge = AI prob − implied prob (1/odds)
 *             >=10% → 5★ | >=7% → 4★ | >=5% → 3★ | >=2% → 2★ | <2% → 1★ | no odds → No Value
 */

/* --------------------------- Data Quality --------------------------- */

const DQ_DEDUCTIONS: Partial<Record<string, number>> = {
  teamStatistics: 25,
  fixtureStatistics: 15,
  h2h: 10,
  odds: 20,
  predictions: 20,
  lineups: 5,
  injuries: 5,
};

export function computeDataQuality(status: EndpointStatus[]): number {
  let dq = 100;
  for (const s of status) {
    if (s.state !== "ok") dq -= DQ_DEDUCTIONS[s.endpoint] ?? 0;
  }
  return Math.max(0, dq);
}

/* ----------------------------- AI Score ----------------------------- */

export interface AiScoreParts {
  /** each 0-1 (quality of signal favoring the pick), undefined = data missing */
  teamStats?: number;
  form?: number;
  h2h?: number;
  odds?: number;
  predictions?: number;
  lineupsInjuries?: number;
}

const AI_WEIGHTS: Record<keyof AiScoreParts, number> = {
  teamStats: 25,
  form: 20,
  h2h: 15,
  odds: 15,
  predictions: 15,
  lineupsInjuries: 10,
};

/** Score only from blocks that exist — missing blocks contribute nothing. */
export function computeAiScore(parts: AiScoreParts): number {
  let score = 0;
  for (const key of Object.keys(AI_WEIGHTS) as (keyof AiScoreParts)[]) {
    const v = parts[key];
    if (v !== undefined) score += Math.max(0, Math.min(1, v)) * AI_WEIGHTS[key];
  }
  return Math.round(score);
}

/* ------------------------ Confidence / Risk ------------------------ */

export function computeConfidence(dataQuality: number, aiScore: number): ConfidenceLevel {
  if (dataQuality >= 80 && aiScore >= 70) return "HIGH";
  if (dataQuality >= 50 && aiScore >= 50) return "MEDIUM";
  return "LOW";
}

export function computeRisk(dataQuality: number): RiskLevel {
  if (dataQuality < 50) return "HIGH";
  if (dataQuality < 80) return "MEDIUM";
  return "LOW";
}

/* ----------------------------- Value ----------------------------- */

export function computeValue(
  aiProb: number | null,
  odd: number | null
): { rating: ValueRating; stars: number; edgePct: number } {
  if (!aiProb || !odd || odd <= 1) {
    return { rating: "NO_VALUE", stars: 0, edgePct: 0 };
  }
  const implied = 1 / odd;
  const edgePct = +((aiProb - implied) * 100).toFixed(1);
  if (edgePct >= 10) return { rating: "ELITE_VALUE", stars: 5, edgePct };
  if (edgePct >= 7) return { rating: "STRONG_VALUE", stars: 4, edgePct };
  if (edgePct >= 5) return { rating: "GOOD_VALUE", stars: 3, edgePct };
  if (edgePct >= 2) return { rating: "SMALL_VALUE", stars: 2, edgePct };
  return { rating: "NO_VALUE", stars: 1, edgePct };
}

/* -------------------- Odds market extraction -------------------- */

/** Pick the preferred bookmaker (Bet365 → Pinnacle → 1xBet → first available). */
export function pickBookmaker(bookmakers: AfOddsBookmaker[]): AfOddsBookmaker | null {
  for (const name of PREFERRED_BOOKMAKERS) {
    const b = bookmakers.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (b) return b;
  }
  return bookmakers[0] ?? null;
}

export interface MatchWinnerOdds {
  home: number;
  draw: number;
  away: number;
  bookmaker: string;
}

export function extractMatchWinner(bookmakers: AfOddsBookmaker[]): MatchWinnerOdds | null {
  const bk = pickBookmaker(bookmakers);
  if (!bk) return null;
  const bet = (bk.bets ?? []).find((b) => b.name === "Match Winner" || b.id === 1);
  if (!bet) return null;
  const v = (label: string) => Number((bet.values ?? []).find((x) => x.value === label)?.odd ?? 0);
  const home = v("Home"), draw = v("Draw"), away = v("Away");
  if (!home || !draw || !away) return null;
  return { home, draw, away, bookmaker: bk.name };
}

export interface OverUnderMarket {
  line: number;
  overOdd: number;
  underOdd: number;
  bookmaker: string;
}

/** Goals Over/Under — prefer line 2.5, else the closest available line. */
export function extractOverUnder(bookmakers: AfOddsBookmaker[]): OverUnderMarket | null {
  const bk = pickBookmaker(bookmakers);
  if (!bk) return null;
  // รวมสองตลาด: "Goals Over/Under" (เส้นครึ่งลูก) + "Goal Line" (เส้นเอเชีย 2/2.25/2.75)
  // — เส้นสมดุลจริงมักอยู่ในตลาด Goal Line เช่น 2.25 ขณะที่ 2.5 ราคาเอียง
  const bets = (bk.bets ?? []).filter(
    (b) => b.name === "Goals Over/Under" || b.id === 5 || b.name === "Goal Line" || b.id === 50
  );
  if (bets.length === 0) return null;

  const lines = new Map<number, { over?: number; under?: number }>();
  for (const bet of bets) {
    for (const v of bet.values ?? []) {
      const m = v.value.match(/^(Over|Under)\s+([\d.]+)$/);
      if (!m) continue;
      const line = Number(m[2]);
      const entry = lines.get(line) ?? {};
      if (m[1] === "Over") entry.over = Number(v.odd);
      else entry.under = Number(v.odd);
      lines.set(line, entry);
    }
  }
  const complete = [...lines.entries()].filter(([, e]) => e.over && e.under);
  if (complete.length === 0) return null;
  // เส้นหลักของตลาด = คู่ราคาสมดุลที่สุด (เสมอภาค) — เสมอกันให้เลือกใกล้ 2.5
  complete.sort(
    (a, b) =>
      Math.abs(a[1].over! - a[1].under!) - Math.abs(b[1].over! - b[1].under!) ||
      Math.abs(a[0] - 2.5) - Math.abs(b[0] - 2.5)
  );
  const [line, e] = complete[0];
  return { line, overOdd: e.over!, underOdd: e.under!, bookmaker: bk.name };
}

export interface HandicapMarket {
  /** line relative to HOME team (negative = home gives) */
  line: number;
  homeOdd: number;
  awayOdd: number;
  bookmaker: string;
}

/** Asian Handicap — preferred bookmakers first; most balanced line wins. */
export function extractAsianHandicap(bookmakers: AfOddsBookmaker[]): HandicapMarket | null {
  const ordered = [
    ...PREFERRED_BOOKMAKERS.map((n) =>
      bookmakers.find((x) => x.name.toLowerCase() === n.toLowerCase())
    ).filter((b): b is AfOddsBookmaker => !!b),
    ...bookmakers,
  ];
  for (const bk of ordered) {
    const bet = (bk.bets ?? []).find((b) => b.name === "Asian Handicap" || b.id === 4);
    if (!bet) continue;
    const lines = new Map<number, { home?: number; away?: number }>();
    for (const v of bet.values ?? []) {
      const m = v.value.match(/^(Home|Away)\s+([+-]?[\d.]+)$/);
      if (!m) continue;
      // API-Football convention: the number IS the market line (home perspective);
      // "Home -1.25" and "Away -1.25" are the two sides of the same -1.25 line.
      const line = Number(m[2]); // Number("+1.25") === 1.25
      const entry = lines.get(line) ?? {};
      if (m[1] === "Home") entry.home = Number(v.odd);
      else entry.away = Number(v.odd);
      lines.set(line, entry);
    }
    // most balanced = |homeOdd - awayOdd| smallest
    let best: HandicapMarket | null = null;
    for (const [line, e] of lines) {
      if (!e.home || !e.away) continue;
      if (!best || Math.abs(e.home - e.away) < Math.abs(best.homeOdd - best.awayOdd)) {
        best = { line, homeOdd: e.home, awayOdd: e.away, bookmaker: bk.name };
      }
    }
    if (best) return best;
  }
  return null;
}

export interface CornersMarket {
  line: number;
  overOdd: number;
  underOdd: number;
  bookmaker: string;
}

/** Corners Over Under — pre-match corner line from the odds market. */
export function extractCornersOverUnder(bookmakers: AfOddsBookmaker[]): CornersMarket | null {
  const ordered = [
    ...PREFERRED_BOOKMAKERS.map((n) =>
      bookmakers.find((x) => x.name.toLowerCase() === n.toLowerCase())
    ).filter((b): b is AfOddsBookmaker => !!b),
    ...bookmakers,
  ];
  for (const bk of ordered) {
    const bet = (bk.bets ?? []).find((b) => b.name === "Corners Over Under");
    if (!bet) continue;
    const lines = new Map<number, { over?: number; under?: number }>();
    for (const v of bet.values ?? []) {
      const m = v.value.match(/^(Over|Under)\s+([\d.]+)$/);
      if (!m) continue;
      const line = Number(m[2]);
      const entry = lines.get(line) ?? {};
      if (m[1] === "Over") entry.over = Number(v.odd);
      else entry.under = Number(v.odd);
      lines.set(line, entry);
    }
    let best: CornersMarket | null = null;
    for (const [line, e] of lines) {
      if (!e.over || !e.under) continue;
      if (!best || Math.abs(e.over - e.under) < Math.abs(best.overOdd - best.underOdd)) {
        best = { line, overOdd: e.over, underOdd: e.under, bookmaker: bk.name };
      }
    }
    if (best) return best;
  }
  return null;
}

export function extractBtts(
  bookmakers: AfOddsBookmaker[]
): { yes: number; no: number; bookmaker: string } | null {
  const bk = pickBookmaker(bookmakers);
  if (!bk) return null;
  const bet = (bk.bets ?? []).find((b) => b.name === "Both Teams Score" || b.id === 8);
  if (!bet) return null;
  const yes = Number((bet.values ?? []).find((v) => v.value === "Yes")?.odd ?? 0);
  const no = Number((bet.values ?? []).find((v) => v.value === "No")?.odd ?? 0);
  return yes && no ? { yes, no, bookmaker: bk.name } : null;
}

/* ----------------------- Poisson goal model ----------------------- */

function poisson(k: number, lambda: number): number {
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact;
}

export interface PoissonResult {
  home: number;
  draw: number;
  away: number;
  likelyScoreByOutcome: Record<"HOME" | "DRAW" | "AWAY", { home: number; away: number }>;
  totalXg: number;
  /** P(ประตูรวม = t) — ใช้คำนวณโอกาส Over/Under จากการแจกแจงเต็ม */
  totalGoalsProbs: number[];
}

/** โอกาสที่ประตูรวมจะ "สูงกว่า" เส้น (เส้น x.5 หรือเต็มลูกก็ได้) */
/**
 * โอกาส "ชนะจริง" ของแต่ละฝั่งที่เส้นนี้ — รองรับเส้นเต็ม (push) และเส้นเศษ .25/.75 (ครึ่งเดียว)
 * ชนะเต็ม = 1, ชนะครึ่ง = 0.5, push/แพ้ครึ่ง = ไม่นับเข้าอีกฝั่ง — ใช้ตัดสินใจ O/U อย่างเป็นธรรม
 */
export function ouSideScores(poi: PoissonResult, line: number): { over: number; under: number } {
  let over = 0;
  let under = 0;
  for (let t = 0; t < poi.totalGoalsProbs.length; t++) {
    const prob = poi.totalGoalsProbs[t];
    const d = t - line;
    if (d >= 0.3) over += prob;
    else if (d > 0) over += 0.5 * prob; // ห่าง 0.25 = ชนะครึ่ง
    else if (d <= -0.3) under += prob;
    else if (d < 0) under += 0.5 * prob;
    // d === 0 → push ไม่นับทั้งคู่
  }
  return { over, under };
}

export function probOverLine(poi: PoissonResult, line: number): number {
  let p = 0;
  for (let t = 0; t < poi.totalGoalsProbs.length; t++) {
    if (t > line) p += poi.totalGoalsProbs[t];
  }
  return p;
}

export function poissonFromAverages(
  homeGfAvg: number,
  homeGaAvg: number,
  awayGfAvg: number,
  awayGaAvg: number,
  leagueAvg = 1.4,
  homeBoost = 1.12 // 1.0 = สนามกลาง ไม่มีแต้มต่อเจ้าบ้าน
): PoissonResult {
  const HOME_BOOST = homeBoost;
  const homeXg =
    Math.max(0.2, homeGfAvg) * (Math.max(0.3, awayGaAvg) / leagueAvg) * HOME_BOOST;
  const awayXg =
    Math.max(0.2, awayGfAvg) * (Math.max(0.3, homeGaAvg) / leagueAvg) * (2 - HOME_BOOST);

  const MAX = 7;
  let home = 0, draw = 0, away = 0;
  const totalGoalsProbs = new Array(MAX * 2 + 1).fill(0);
  const best = {
    HOME: { h: 1, a: 0, p: 0 },
    DRAW: { h: 1, a: 1, p: 0 },
    AWAY: { h: 0, a: 1, p: 0 },
  };
  for (let h = 0; h <= MAX; h++) {
    for (let a = 0; a <= MAX; a++) {
      const p = poisson(h, homeXg) * poisson(a, awayXg);
      const outcome = h > a ? "HOME" : h === a ? "DRAW" : "AWAY";
      if (outcome === "HOME") home += p;
      else if (outcome === "DRAW") draw += p;
      else away += p;
      totalGoalsProbs[h + a] += p;
      if (p > best[outcome].p) best[outcome] = { h, a, p };
    }
  }
  const total = home + draw + away;
  return {
    home: home / total,
    draw: draw / total,
    away: away / total,
    likelyScoreByOutcome: {
      HOME: { home: best.HOME.h, away: best.HOME.a },
      DRAW: { home: best.DRAW.h, away: best.DRAW.a },
      AWAY: { home: best.AWAY.h, away: best.AWAY.a },
    },
    totalXg: homeXg + awayXg,
    totalGoalsProbs: totalGoalsProbs.map((x) => x / total),
  };
}
