import {
  Team,
  League,
  H2H,
  Player,
  WeatherInfo,
  OddsAnalysis,
  Prediction,
  ModelOutput,
  DataSourceFlag,
  CornerAnalysis,
  PickSide,
  ModelWeights,
  DEFAULT_MODEL_WEIGHTS,
} from "../types";
import {
  computeAiScore,
  deriveConfidence,
  deriveRiskLevel,
  deriveStatus,
  deriveValue,
  ScoreFactors,
} from "./score";

/**
 * Real prediction engine — consumes NORMALIZED data (works identically for
 * mock and live providers) and produces the full Prediction object.
 *
 * Models:
 *  - Statistical Model : Poisson goal model from attack/defense averages
 *  - Form Model        : recent W/D/L points
 *  - Odds Model        : market implied probabilities (when odds available)
 * Blended, then scored through the weighted AI Score formula.
 */
export interface PredictionInput {
  home: Team;
  away: Team;
  league: League;
  h2h?: H2H;
  odds?: OddsAnalysis;
  weather?: WeatherInfo;
  homeInjuries: Player[];
  awayInjuries: Player[];
  dataSources: DataSourceFlag[];
  /** average goals per team per match in this league (default 1.4) */
  leagueGoalAvg?: number;
  /** average total corners in this league (default 9.8) */
  leagueCornerAvg?: number;
  weights?: ModelWeights;
}

/* ---------------- Poisson statistical model ---------------- */

function poisson(k: number, lambda: number): number {
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact;
}

export function expectedGoals(input: PredictionInput) {
  const avg = input.leagueGoalAvg ?? 1.4;
  const HOME_BOOST = 1.12; // home advantage
  const homeXg =
    Math.max(0.2, input.home.statsAvg.goalsFor) *
    (Math.max(0.3, input.away.statsAvg.goalsAgainst) / avg) *
    HOME_BOOST;
  const awayXg =
    Math.max(0.2, input.away.statsAvg.goalsFor) *
    (Math.max(0.3, input.home.statsAvg.goalsAgainst) / avg) *
    (2 - HOME_BOOST);
  return { homeXg, awayXg };
}

function poissonProbs(homeXg: number, awayXg: number) {
  const MAX = 7;
  let home = 0,
    draw = 0,
    away = 0;
  // Most likely scoreline PER outcome, so the displayed expected score can
  // always agree with the AI pick (a "Portugal Win" pick must never show 1-1).
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
  };
}

/* ---------------- Form model ---------------- */

function formPoints(team: Team): number {
  // most recent first; weight recent matches higher
  return team.form.reduce((sum, r, i) => {
    const w = 1 - i * 0.12;
    return sum + (r === "W" ? 3 : r === "D" ? 1 : 0) * w;
  }, 0);
}

function formProbs(home: Team, away: Team) {
  const fh = formPoints(home) + 1.5; // home edge
  const fa = formPoints(away);
  const total = fh + fa + 4; // 4 = draw mass
  return { home: fh / total, draw: 4 / total, away: fa / total };
}

/* ---------------- Odds model ---------------- */

function impliedProbs(odds: OddsAnalysis) {
  const { home, draw, away } = odds.current;
  if (!home || !draw || !away) return null;
  const ih = 1 / home,
    id = 1 / draw,
    ia = 1 / away;
  const total = ih + id + ia; // strips bookmaker margin
  return { home: ih / total, draw: id / total, away: ia / total };
}

/* ---------------- Data quality / risk ---------------- */

function dataQualityScore(sources: DataSourceFlag[]): number {
  const weightsBySource: Record<string, number> = {
    "Fixture Data": 20,
    "Odds Data": 15,
    "Weather Data": 5,
    "Historical Data": 20,
    "Player Data": 15,
    "Injury Data": 15,
    "Lineup Data": 10,
  };
  let got = 0,
    max = 0;
  for (const s of sources) {
    const w = weightsBySource[s.source] ?? 5;
    max += w;
    if (s.available) got += w;
  }
  return max === 0 ? 0 : Math.round((got / max) * 100);
}

function riskAssessment(input: PredictionInput, handicapLine: number) {
  const factors: string[] = [];
  let score = 10;

  const lineupMissing = !input.dataSources.find((s) => s.source === "Lineup Data")?.available;
  if (lineupMissing) {
    factors.push("รายชื่อตัวจริงยังไม่ประกาศ");
    score += 12;
  }
  if (!input.odds) {
    factors.push("ไม่มีข้อมูลราคาจากตลาด");
    score += 15;
  }
  if (input.league.isCup) {
    factors.push("บอลถ้วย — ทีมอาจโรเตชั่นผู้เล่น");
    score += 15;
  }
  const injuries = input.homeInjuries.length + input.awayInjuries.length;
  if (injuries >= 3) {
    factors.push(`มีผู้เล่นบาดเจ็บ/ติดโทษแบนรวม ${injuries} ราย`);
    score += 10;
  }
  if (Math.abs(handicapLine) >= 1.5) {
    factors.push("ราคาต่อลึก ความเสี่ยงแฮนดิแคปสูง");
    score += 12;
  }
  if (input.weather && input.weather.impactScore >= 50) {
    factors.push("สภาพอากาศแย่ อาจกระทบรูปเกม");
    score += 10;
  }
  if (input.odds?.steamMove) score += 5;

  return { factors, score: Math.min(100, score) };
}

/* ---------------- Thai reason generation ---------------- */

function buildReasons(
  input: PredictionInput,
  pick: PickSide,
  probs: { home: number; draw: number; away: number }
): string[] {
  const { home, away, h2h, odds } = input;
  const picked = pick === "AWAY" ? away : home;
  const other = pick === "AWAY" ? home : away;
  const reasons: { text: string; weight: number }[] = [];

  const fp = formPoints(picked);
  const fo = formPoints(other);
  if (fp > fo + 1) {
    const wins = picked.form.filter((r) => r === "W").length;
    reasons.push({
      text: `${picked.shortName} ฟอร์มดีกว่า 5 นัดหลังสุด ชนะ ${wins} นัด`,
      weight: fp - fo,
    });
  }
  if (picked.statsAvg.goalsFor > other.statsAvg.goalsFor + 0.3) {
    reasons.push({
      text: `${picked.shortName} ยิงเฉลี่ย ${picked.statsAvg.goalsFor.toFixed(2)} ประตูต่อนัด สูงกว่า ${other.shortName} (${other.statsAvg.goalsFor.toFixed(2)})`,
      weight: picked.statsAvg.goalsFor - other.statsAvg.goalsFor,
    });
  }
  if (other.statsAvg.goalsAgainst > picked.statsAvg.goalsAgainst + 0.25) {
    reasons.push({
      text: `${other.shortName} เสียประตูเฉลี่ย ${other.statsAvg.goalsAgainst.toFixed(2)} ต่อนัด แนวรับเปราะกว่า`,
      weight: other.statsAvg.goalsAgainst - picked.statsAvg.goalsAgainst,
    });
  }
  const otherInjuries = pick === "AWAY" ? input.homeInjuries : input.awayInjuries;
  if (otherInjuries.length > 0) {
    reasons.push({
      text: `${other.shortName} มีผู้เล่นบาดเจ็บ/ติดโทษแบน ${otherInjuries.length} ราย`,
      weight: otherInjuries.length * 0.8,
    });
  }
  if (pick === "HOME" && home.rank > 0 && away.rank > 0 && home.rank < away.rank) {
    reasons.push({
      text: `${home.shortName} อันดับ ${home.rank} เหนือกว่า ${away.shortName} อันดับ ${away.rank} และได้เล่นในบ้าน`,
      weight: (away.rank - home.rank) * 0.3,
    });
  }
  if (h2h) {
    const pickedWins = pick === "AWAY" ? h2h.awayWins : h2h.homeWins;
    const otherWins = pick === "AWAY" ? h2h.homeWins : h2h.awayWins;
    if (pickedWins > otherWins) {
      reasons.push({
        text: `สถิติเจอกัน ${picked.shortName} ชนะ ${pickedWins} จาก ${h2h.homeWins + h2h.draws + h2h.awayWins} นัด`,
        weight: (pickedWins - otherWins) * 0.4,
      });
    }
  }
  if (odds) {
    const implied = impliedProbs(odds);
    const pickProb = pick === "AWAY" ? probs.away : pick === "DRAW" ? probs.draw : probs.home;
    const marketProb = implied ? (pick === "AWAY" ? implied.away : pick === "DRAW" ? implied.draw : implied.home) : 0;
    if (odds.steamMove) {
      reasons.push({ text: `ราคาบอลไหลเข้าฝั่ง ${picked.shortName} ต่อเนื่อง`, weight: 1.2 });
    } else if (pickProb - marketProb > 0.03) {
      reasons.push({
        text: `โมเดล AI ให้โอกาส ${picked.shortName} สูงกว่าที่ตลาดประเมิน`,
        weight: 0.8,
      });
    }
  }
  if (reasons.length < 3) {
    reasons.push({
      text: `ค่าพลังรวมของ ${picked.shortName} (${picked.power.overall}) สูงกว่า ${other.shortName} (${other.power.overall})`,
      weight: 0.5,
    });
  }

  return reasons
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((r) => r.text);
}

/* ---------------- Lines (handicap / OU / corners) ---------------- */

/**
 * Consistency rule: the handicap line must agree with the expected scoreline.
 * e.g. expected 2-1 (margin 1) cannot justify a -1.5 line; expected draw
 * cannot justify any deep line. The line is capped by the expected margin.
 */
function consistentHandicap(probLine: number, expectedMargin: number): number {
  const cap =
    Math.abs(expectedMargin) >= 3 ? 2.5 :
    Math.abs(expectedMargin) === 2 ? 1.5 :
    Math.abs(expectedMargin) === 1 ? 0.75 :
    0.25; // expected draw → at most a quarter-ball line
  return Math.max(-cap, Math.min(cap, probLine));
}

function handicapFromProbs(homeProb: number, awayProb: number): number {
  const diff = homeProb - awayProb;
  if (diff > 0.45) return -1.5;
  if (diff > 0.35) return -1;
  if (diff > 0.25) return -0.75;
  if (diff > 0.15) return -0.5;
  if (diff > 0.05) return -0.25;
  if (diff > -0.05) return 0;
  if (diff > -0.15) return 0.25;
  if (diff > -0.25) return 0.5;
  if (diff > -0.35) return 0.75;
  return 1;
}

export function buildCornerAnalysis(
  input: PredictionInput,
  aiScore: number
): CornerAnalysis {
  const leagueAvg = input.leagueCornerAvg ?? 9.8;
  const hasCornerData =
    input.home.statsAvg.corners > 0 && input.away.statsAvg.corners > 0;
  const projection = hasCornerData
    ? input.home.statsAvg.corners + input.away.statsAvg.corners
    : leagueAvg;
  const line = Math.round(projection - 0.5) + 0.5;
  return {
    hasData: hasCornerData,
    homeForAvg: +input.home.statsAvg.corners.toFixed(1),
    homeAgainstAvg: +(leagueAvg / 2).toFixed(1),
    awayForAvg: +input.away.statsAvg.corners.toFixed(1),
    awayAgainstAvg: +(leagueAvg / 2).toFixed(1),
    firstHalfAvg: +(projection * 0.44).toFixed(1),
    secondHalfAvg: +(projection * 0.56).toFixed(1),
    leagueAvg,
    totalProjection: +projection.toFixed(1),
    line,
    pick: projection > line ? "OVER" : "UNDER",
    confidencePct: Math.min(85, Math.max(40, aiScore - (hasCornerData ? 8 : 25))),
  };
}

/* ---------------- Main entry ---------------- */

export function buildPrediction(input: PredictionInput): Prediction {
  const weights = input.weights ?? DEFAULT_MODEL_WEIGHTS;
  const { home, away } = input;

  // --- model probabilities ---
  const { homeXg, awayXg } = expectedGoals(input);
  const stat = poissonProbs(homeXg, awayXg);
  const form = formProbs(home, away);
  const market = input.odds ? impliedProbs(input.odds) : null;

  const blendWeights = market
    ? { stat: 0.45, form: 0.25, odds: 0.3 }
    : { stat: 0.6, form: 0.4, odds: 0 };

  const blend = (k: "home" | "draw" | "away") =>
    stat[k] * blendWeights.stat +
    form[k] * blendWeights.form +
    (market ? market[k] * blendWeights.odds : 0);

  let ph = blend("home"),
    pd = blend("draw"),
    pa = blend("away");
  const norm = ph + pd + pa;
  ph /= norm;
  pd /= norm;
  pa /= norm;

  const pick: PickSide = ph >= pa && ph >= pd ? "HOME" : pa >= ph && pa >= pd ? "AWAY" : "DRAW";
  const pickTeam = pick === "HOME" ? home : pick === "AWAY" ? away : null;
  const pickProb = pick === "HOME" ? ph : pick === "AWAY" ? pa : pd;

  // --- AI Score factors (each normalized 0-100, relative to picked side) ---
  const pickedTeam = pick === "AWAY" ? away : home;
  const otherTeam = pick === "AWAY" ? home : away;
  const fDiff = formPoints(pickedTeam) - formPoints(otherTeam);
  const factors: ScoreFactors = {
    teamForm: clamp(50 + fDiff * 6),
    homeAwayStrength: clamp(
      pick === "AWAY"
        ? 40 + (away.power.awayStrength - home.power.homeStrength)
        : 50 + (home.power.homeStrength - away.power.awayStrength)
    ),
    attackDefense: clamp(50 + (pickedTeam.power.attack - otherTeam.power.defense) * 0.9),
    injuries: clamp(80 - pickedInjuryImpact(input, pick) + otherInjuryBonus(input, pick)),
    oddsMovement: input.odds
      ? input.odds.steamMove && pick === "HOME"
        ? 85
        : 65
      : 40,
    headToHead: input.h2h ? h2hFactor(input.h2h, pick) : 50,
    cornerTrend: clamp(40 + (home.statsAvg.corners + away.statsAvg.corners - (input.leagueCornerAvg ?? 9.8)) * 6 + 10),
    weatherTravelFatigue: input.weather ? clamp(95 - input.weather.impactScore) : 60,
  };
  const aiScore = computeAiScore(factors, weights);

  // Expected score must agree with the pick (consistency rule)
  const expectedScore = stat.likelyScoreByOutcome[pick];
  const expectedMargin = expectedScore.home - expectedScore.away;

  // --- quality, risk, value ---
  const dataQuality = dataQualityScore(input.dataSources);
  const handicapLine = consistentHandicap(
    handicapFromProbs(ph, pa),
    expectedMargin
  );
  const { factors: riskFactors, score: riskScore } = riskAssessment(input, handicapLine);
  const confidence = deriveConfidence(aiScore, dataQuality);
  const risk = deriveRiskLevel(riskScore);

  const marketPickProb = market
    ? (pick === "HOME" ? market.home : pick === "AWAY" ? market.away : market.draw)
    : pickProb; // no odds → no measurable edge
  const edgePct = +((pickProb - marketPickProb) * 100).toFixed(1);
  const { rating: value, stars: valueStars } = deriveValue(input.odds ? edgePct : 0);

  // --- lines ---
  const totalXg = homeXg + awayXg;
  const ouLine = 2.5;
  const overUnderPick = totalXg >= 2.55 ? "OVER" : "UNDER";
  const corners = buildCornerAnalysis(input, aiScore);

  const handicapTeam = handicapLine <= 0 ? home.shortName : away.shortName;
  const handicapStr = `${handicapTeam} ${handicapLine <= 0 ? handicapLine : -handicapLine}`;

  const modelOutputs: ModelOutput[] = [
    { model: "Statistical Model (Poisson)", modelTh: "โมเดลสถิติ (Poisson)", homeProb: pc(stat.home), drawProb: pc(stat.draw), awayProb: pc(stat.away), weight: blendWeights.stat * 100 },
    { model: "Form Model", modelTh: "โมเดลฟอร์ม", homeProb: pc(form.home), drawProb: pc(form.draw), awayProb: pc(form.away), weight: blendWeights.form * 100 },
    ...(market
      ? [{ model: "Odds Model", modelTh: "โมเดลราคา (ตลาด)", homeProb: pc(market.home), drawProb: pc(market.draw), awayProb: pc(market.away), weight: blendWeights.odds * 100 }]
      : []),
  ];

  return {
    pick,
    pickTeamName: pickTeam ? pickTeam.name : "Draw",
    pickLabel: pickTeam ? `${pickTeam.name.toUpperCase()} WIN` : "DRAW",
    winProbability: { home: pc(ph), draw: pc(pd), away: pc(pa) },
    expectedScore,
    handicapLine,
    handicapPickTeam: handicapStr,
    overUnderLine: ouLine,
    overUnderPick,
    cornerLine: corners.line,
    cornerPick: corners.pick,
    aiScore,
    confidence,
    risk,
    riskScore,
    value,
    valueStars,
    edgePct: input.odds ? edgePct : 0,
    dataQuality,
    status: deriveStatus(aiScore, riskScore, dataQuality),
    reasons: buildReasons(input, pick, { home: ph, draw: pd, away: pa }),
    riskFactors,
    warning: "This is an AI statistical prediction, not a guaranteed result.",
    modelOutputs,
  };
}

/* ---------------- helpers ---------------- */

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const pc = (p: number) => Math.round(p * 100);

function pickedInjuryImpact(input: PredictionInput, pick: PickSide): number {
  const list = pick === "AWAY" ? input.awayInjuries : input.homeInjuries;
  return Math.min(40, list.length * 10);
}

function otherInjuryBonus(input: PredictionInput, pick: PickSide): number {
  const list = pick === "AWAY" ? input.homeInjuries : input.awayInjuries;
  return Math.min(20, list.length * 6);
}

function h2hFactor(h2h: H2H, pick: PickSide): number {
  const total = h2h.homeWins + h2h.draws + h2h.awayWins;
  if (total === 0) return 50;
  const wins = pick === "AWAY" ? h2h.awayWins : pick === "DRAW" ? h2h.draws : h2h.homeWins;
  return clamp((wins / total) * 130);
}
