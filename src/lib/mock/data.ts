import {
  Fixture,
  League,
  Player,
  Team,
  AccuracyStats,
  OverviewStats,
  FormResult,
  OddsPoint,
  Prediction,
  ModelOutput,
} from "../types";
import {
  deriveConfidence,
  deriveRiskLevel,
  deriveStatus,
  deriveValue,
} from "../engine/score";

/* ============================== LEAGUES ============================== */

export const leagues: League[] = [
  { id: "epl", name: "Premier League", nameTh: "พรีเมียร์ลีก", country: "England", enabled: true, isCup: false },
  { id: "laliga", name: "La Liga", nameTh: "ลาลีกา", country: "Spain", enabled: true, isCup: false },
  { id: "bundesliga", name: "Bundesliga", nameTh: "บุนเดสลีกา", country: "Germany", enabled: true, isCup: false },
  { id: "seriea", name: "Serie A", nameTh: "เซเรีย อา", country: "Italy", enabled: true, isCup: false },
  { id: "ligue1", name: "Ligue 1", nameTh: "ลีกเอิง", country: "France", enabled: true, isCup: false },
  { id: "ucl", name: "UEFA Champions League", nameTh: "ยูฟ่าแชมเปียนส์ลีก", country: "Europe", enabled: true, isCup: true },
  { id: "uel", name: "Europa League", nameTh: "ยูโรปาลีก", country: "Europe", enabled: false, isCup: true },
  { id: "facup", name: "FA Cup", nameTh: "เอฟเอคัพ", country: "England", enabled: false, isCup: true },
];

/* ============================== TEAMS ============================== */

const form = (s: string): FormResult[] => s.split("") as FormResult[];

export const teams: Team[] = [
  {
    id: "mci", name: "Manchester City", shortName: "Man City", leagueId: "epl",
    rank: 1, points: 82, form: form("WWWDW"),
    power: { overall: 92, attack: 94, defense: 88, homeStrength: 95, awayStrength: 87, pressing: 90, setPiece: 84, corner: 88, injuryImpact: 8, squadDepth: 93, fitness: 91, tacticalStability: 92 },
    statsAvg: { goalsFor: 2.45, goalsAgainst: 0.92, possession: 61, shots: 15.2, corners: 5.8 },
  },
  {
    id: "liv", name: "Liverpool", shortName: "Liverpool", leagueId: "epl",
    rank: 3, points: 75, form: form("WLWWD"),
    power: { overall: 88, attack: 90, defense: 80, homeStrength: 90, awayStrength: 82, pressing: 92, setPiece: 81, corner: 84, injuryImpact: 32, squadDepth: 85, fitness: 86, tacticalStability: 85 },
    statsAvg: { goalsFor: 2.1, goalsAgainst: 1.05, possession: 58, shots: 13.4, corners: 5.1 },
  },
  {
    id: "rma", name: "Real Madrid", shortName: "Real Madrid", leagueId: "laliga",
    rank: 1, points: 80, form: form("WWDWW"),
    power: { overall: 91, attack: 92, defense: 86, homeStrength: 93, awayStrength: 88, pressing: 84, setPiece: 86, corner: 82, injuryImpact: 12, squadDepth: 92, fitness: 90, tacticalStability: 90 },
    statsAvg: { goalsFor: 2.3, goalsAgainst: 0.95, possession: 57, shots: 14.6, corners: 5.4 },
  },
  {
    id: "fcb", name: "Barcelona", shortName: "Barcelona", leagueId: "laliga",
    rank: 2, points: 77, form: form("WDWWL"),
    power: { overall: 89, attack: 90, defense: 82, homeStrength: 91, awayStrength: 84, pressing: 87, setPiece: 80, corner: 83, injuryImpact: 22, squadDepth: 86, fitness: 87, tacticalStability: 84 },
    statsAvg: { goalsFor: 2.2, goalsAgainst: 1.0, possession: 63, shots: 14.1, corners: 5.6 },
  },
  {
    id: "bay", name: "Bayern Munich", shortName: "Bayern", leagueId: "bundesliga",
    rank: 1, points: 79, form: form("WWWWD"),
    power: { overall: 91, attack: 95, defense: 84, homeStrength: 94, awayStrength: 86, pressing: 89, setPiece: 85, corner: 87, injuryImpact: 10, squadDepth: 90, fitness: 92, tacticalStability: 89 },
    statsAvg: { goalsFor: 2.7, goalsAgainst: 1.1, possession: 62, shots: 16.3, corners: 6.2 },
  },
  {
    id: "bvb", name: "Borussia Dortmund", shortName: "Dortmund", leagueId: "bundesliga",
    rank: 4, points: 62, form: form("WLDWL"),
    power: { overall: 83, attack: 86, defense: 76, homeStrength: 89, awayStrength: 76, pressing: 84, setPiece: 78, corner: 80, injuryImpact: 25, squadDepth: 80, fitness: 83, tacticalStability: 76 },
    statsAvg: { goalsFor: 2.0, goalsAgainst: 1.4, possession: 55, shots: 13.0, corners: 5.3 },
  },
  {
    id: "int", name: "Inter Milan", shortName: "Inter", leagueId: "seriea",
    rank: 1, points: 78, form: form("WWDWW"),
    power: { overall: 88, attack: 87, defense: 89, homeStrength: 91, awayStrength: 84, pressing: 85, setPiece: 86, corner: 84, injuryImpact: 14, squadDepth: 86, fitness: 88, tacticalStability: 90 },
    statsAvg: { goalsFor: 2.1, goalsAgainst: 0.8, possession: 56, shots: 13.8, corners: 5.5 },
  },
  {
    id: "acm", name: "AC Milan", shortName: "AC Milan", leagueId: "seriea",
    rank: 3, points: 68, form: form("DWLWW"),
    power: { overall: 84, attack: 84, defense: 81, homeStrength: 88, awayStrength: 79, pressing: 82, setPiece: 79, corner: 81, injuryImpact: 18, squadDepth: 81, fitness: 85, tacticalStability: 82 },
    statsAvg: { goalsFor: 1.8, goalsAgainst: 1.1, possession: 54, shots: 12.6, corners: 5.0 },
  },
  {
    id: "psg", name: "Paris Saint-Germain", shortName: "PSG", leagueId: "ligue1",
    rank: 1, points: 84, form: form("WWWWW"),
    power: { overall: 90, attack: 93, defense: 83, homeStrength: 93, awayStrength: 87, pressing: 86, setPiece: 82, corner: 85, injuryImpact: 9, squadDepth: 89, fitness: 91, tacticalStability: 87 },
    statsAvg: { goalsFor: 2.6, goalsAgainst: 0.9, possession: 64, shots: 15.8, corners: 6.0 },
  },
  {
    id: "mar", name: "Marseille", shortName: "Marseille", leagueId: "ligue1",
    rank: 5, points: 58, form: form("LWDLW"),
    power: { overall: 79, attack: 79, defense: 74, homeStrength: 84, awayStrength: 71, pressing: 78, setPiece: 75, corner: 77, injuryImpact: 28, squadDepth: 74, fitness: 80, tacticalStability: 72 },
    statsAvg: { goalsFor: 1.6, goalsAgainst: 1.3, possession: 52, shots: 11.9, corners: 4.7 },
  },
];

export const teamById = (id: string): Team => {
  const t = teams.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown team: ${id}`);
  return t;
};

/* ============================== PLAYERS ============================== */

export const players: Player[] = [
  { id: "haaland", teamId: "mci", name: "Erling Haaland", position: "Forward", positionTh: "กองหน้า", rating: 8.4, goals: 7, assists: 2, fitness: 92, isKeyPlayer: true, status: "fit" },
  { id: "debruyne", teamId: "mci", name: "Kevin De Bruyne", position: "Midfielder", positionTh: "กองกลาง", rating: 8.0, goals: 3, assists: 8, fitness: 88, isKeyPlayer: true, status: "fit" },
  { id: "salah", teamId: "liv", name: "Mohamed Salah", position: "Forward", positionTh: "กองหน้า", rating: 8.1, goals: 5, assists: 4, fitness: 89, isKeyPlayer: true, status: "fit" },
  { id: "vandijk", teamId: "liv", name: "Virgil van Dijk", position: "Defender", positionTh: "กองหลัง", rating: 7.6, goals: 1, assists: 0, fitness: 64, isKeyPlayer: true, status: "doubtful" },
  { id: "vinicius", teamId: "rma", name: "Vinícius Júnior", position: "Forward", positionTh: "กองหน้า", rating: 8.3, goals: 6, assists: 5, fitness: 91, isKeyPlayer: true, status: "fit" },
  { id: "lewa", teamId: "fcb", name: "Robert Lewandowski", position: "Forward", positionTh: "กองหน้า", rating: 7.9, goals: 6, assists: 1, fitness: 85, isKeyPlayer: true, status: "fit" },
  { id: "kane", teamId: "bay", name: "Harry Kane", position: "Forward", positionTh: "กองหน้า", rating: 8.5, goals: 9, assists: 3, fitness: 93, isKeyPlayer: true, status: "fit" },
  { id: "brandt", teamId: "bvb", name: "Julian Brandt", position: "Midfielder", positionTh: "กองกลาง", rating: 7.5, goals: 3, assists: 4, fitness: 86, isKeyPlayer: true, status: "fit" },
  { id: "lautaro", teamId: "int", name: "Lautaro Martínez", position: "Forward", positionTh: "กองหน้า", rating: 8.2, goals: 8, assists: 2, fitness: 90, isKeyPlayer: true, status: "fit" },
  { id: "leao", teamId: "acm", name: "Rafael Leão", position: "Forward", positionTh: "กองหน้า", rating: 7.8, goals: 4, assists: 4, fitness: 87, isKeyPlayer: true, status: "fit" },
  { id: "dembele", teamId: "psg", name: "Ousmane Dembélé", position: "Forward", positionTh: "กองหน้า", rating: 8.2, goals: 7, assists: 6, fitness: 92, isKeyPlayer: true, status: "fit" },
  { id: "aubameyang", teamId: "mar", name: "P-E. Aubameyang", position: "Forward", positionTh: "กองหน้า", rating: 7.4, goals: 5, assists: 1, fitness: 84, isKeyPlayer: true, status: "fit" },
];

export const keyPlayerOf = (teamId: string): Player =>
  players.find((p) => p.teamId === teamId && p.isKeyPlayer) ?? players[0];

/* ============================== FIXTURES ============================== */

const today = new Date();
const iso = (h: number, m: number) => {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

function oddsHistory(openHome: number, curHome: number, line: number, ou: number): OddsPoint[] {
  const steps = 5;
  const pts: OddsPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const home = +(openHome + (curHome - openHome) * t).toFixed(2);
    pts.push({
      time: `${10 + i * 2}:00`,
      home,
      draw: +(3.4 + 0.1 * Math.sin(i)).toFixed(2),
      away: +(4.2 - (home - curHome)).toFixed(2),
      handicapLine: line,
      overUnderLine: ou,
    });
  }
  return pts;
}

interface BuildArgs {
  id: string;
  leagueId: string;
  home: string;
  away: string;
  hour: number;
  minute: number;
  aiScore: number;
  winProb: [number, number, number];
  expected: [number, number];
  handicap: number;
  ouLine: number;
  ouPick: "OVER" | "UNDER";
  cornerLine: number;
  cornerPick: "OVER" | "UNDER";
  riskScore: number;
  dataQuality: number;
  edge: number;
  reasons: string[];
  riskFactors: string[];
  h2h: [number, number, number];
  motd?: boolean;
  alert?: string;
  oddsNote: string;
  steam?: boolean;
  sharp?: boolean;
}

function buildFixture(a: BuildArgs): Fixture {
  const home = teamById(a.home);
  const away = teamById(a.away);
  const [ph, pd, pa] = a.winProb;
  const pick = ph >= pa && ph >= pd ? "HOME" : pa >= pd ? "AWAY" : "DRAW";
  const pickTeam = pick === "HOME" ? home : pick === "AWAY" ? away : null;
  const { rating: value, stars } = deriveValue(a.edge);
  const confidence = deriveConfidence(a.aiScore, a.dataQuality);
  const risk = deriveRiskLevel(a.riskScore);
  const status = deriveStatus(a.aiScore, a.riskScore, a.dataQuality);

  const models: ModelOutput[] = [
    { model: "Statistical Model", modelTh: "โมเดลสถิติ", homeProb: ph + 2, drawProb: pd, awayProb: pa - 2, weight: 25 },
    { model: "Form Model", modelTh: "โมเดลฟอร์ม", homeProb: ph + 4, drawProb: pd - 2, awayProb: pa - 2, weight: 20 },
    { model: "Odds Model", modelTh: "โมเดลราคา", homeProb: ph - 3, drawProb: pd + 1, awayProb: pa + 2, weight: 20 },
    { model: "Player Impact Model", modelTh: "โมเดลผู้เล่น", homeProb: ph + 1, drawProb: pd, awayProb: pa - 1, weight: 15 },
    { model: "Corner Model", modelTh: "โมเดลเตะมุม", homeProb: ph, drawProb: pd, awayProb: pa, weight: 10 },
    { model: "Weather/Fatigue Model", modelTh: "โมเดลอากาศ/ความล้า", homeProb: ph - 1, drawProb: pd + 1, awayProb: pa, weight: 10 },
  ];

  const handicapTeam = a.handicap <= 0 ? home.shortName : away.shortName;
  const handicapStr = `${handicapTeam} ${a.handicap <= 0 ? a.handicap : -a.handicap}`;

  const prediction: Prediction = {
    pick,
    pickTeamName: pickTeam ? pickTeam.name : "Draw",
    pickLabel: pickTeam ? `${pickTeam.name.toUpperCase()} WIN` : "DRAW",
    winProbability: { home: ph, draw: pd, away: pa },
    expectedScore: { home: a.expected[0], away: a.expected[1] },
    handicapLine: a.handicap,
    handicapPickTeam: handicapStr,
    overUnderLine: a.ouLine,
    overUnderPick: a.ouPick,
    cornerLine: a.cornerLine,
    cornerPick: a.cornerPick,
    aiScore: a.aiScore,
    confidence,
    risk,
    riskScore: a.riskScore,
    value,
    valueStars: stars,
    edgePct: a.edge,
    dataQuality: a.dataQuality,
    status,
    reasons: a.reasons,
    riskFactors: a.riskFactors,
    warning:
      "This is an AI statistical prediction, not a guaranteed result.",
    modelOutputs: models,
  };

  const openHome = 1.95;
  const curHome = 1.78;
  const history = oddsHistory(openHome, curHome, a.handicap, a.ouLine);

  const homeKeyPlayer = players.find((p) => p.teamId === home.id && p.isKeyPlayer);
  const awayKeyPlayer = players.find((p) => p.teamId === away.id && p.isKeyPlayer);
  const homeInjuries = players.filter((p) => p.teamId === home.id && p.status !== "fit");
  const awayInjuries = players.filter((p) => p.teamId === away.id && p.status !== "fit");

  return {
    id: a.id,
    leagueId: a.leagueId,
    kickoff: iso(a.hour, a.minute),
    kickoffLabel: `${String(a.hour).padStart(2, "0")}:${String(a.minute).padStart(2, "0")}`,
    status: "SCHEDULED",
    homeTeamId: home.id,
    awayTeamId: away.id,
    league: leagues.find((l) => l.id === a.leagueId) ?? leagues[0],
    homeTeam: home,
    awayTeam: away,
    homeKeyPlayer,
    awayKeyPlayer,
    homeInjuries,
    awayInjuries,
    h2h: { homeWins: a.h2h[0], draws: a.h2h[1], awayWins: a.h2h[2] },
    homeRecent: recentOf(home.form, ["WOL", "FUL", "AVL", "ARS", "WHO"]),
    awayRecent: recentOf(away.form, ["TOT", "WHU", "EVE", "FUL", "WHU"]),
    weather: {
      temperatureC: 18,
      rainProbability: 40,
      windKmh: 12,
      humidity: 72,
      impactScore: 22,
      impactNote: "สภาพอากาศมีผลกระทบต่ำ",
    },
    odds: {
      opening: history[0],
      current: history[history.length - 1],
      history,
      steamMove: a.steam ?? false,
      sharpMoney: a.sharp ?? false,
      movementNote: a.oddsNote,
      marketProbability: {
        home: Math.max(5, ph - a.edge),
        draw: pd,
        away: Math.min(90, pa + a.edge),
      },
    },
    corners: {
      hasData: true,
      homeForAvg: home.statsAvg.corners,
      homeAgainstAvg: 4.2,
      awayForAvg: away.statsAvg.corners,
      awayAgainstAvg: 4.6,
      firstHalfAvg: 4.3,
      secondHalfAvg: 5.9,
      leagueAvg: 9.8,
      totalProjection: +(home.statsAvg.corners + away.statsAvg.corners).toFixed(1),
      line: a.cornerLine,
      pick: a.cornerPick,
      confidencePct: Math.min(90, a.aiScore - 8),
    },
    dataSources: [
      { source: "Fixture Data", sourceTh: "ข้อมูลโปรแกรมแข่ง", available: true },
      { source: "Odds Data", sourceTh: "ข้อมูลราคา", available: true },
      { source: "Weather Data", sourceTh: "ข้อมูลอากาศ", available: true },
      { source: "Historical Data", sourceTh: "สถิติย้อนหลัง", available: true },
      { source: "Player Data", sourceTh: "ข้อมูลนักเตะ", available: true },
      { source: "Injury Data", sourceTh: "ข้อมูลอาการบาดเจ็บ", available: a.dataQuality >= 70 },
      { source: "Lineup Data", sourceTh: "รายชื่อตัวจริง", available: false },
    ],
    prediction,
    isMatchOfTheDay: a.motd ?? false,
    alert: a.alert,
  };
}

function recentOf(f: FormResult[], opps: string[]) {
  const scores: Record<FormResult, string[]> = {
    W: ["3-1", "2-0", "4-1", "2-1", "1-0"],
    D: ["1-1", "2-2", "0-0", "1-1", "2-2"],
    L: ["0-1", "1-2", "0-2", "1-3", "0-1"],
  };
  return f.map((r, i) => ({
    result: r,
    score: scores[r][i % 5],
    opponentShort: opps[i % opps.length],
  }));
}

export const fixtures: Fixture[] = [
  buildFixture({
    id: "fx-mci-liv", leagueId: "epl", home: "mci", away: "liv",
    hour: 19, minute: 30, aiScore: 88, winProb: [54, 25, 21],
    expected: [2, 1], handicap: -0.25, ouLine: 2.5, ouPick: "OVER",
    cornerLine: 9.5, cornerPick: "OVER", riskScore: 22, dataQuality: 82,
    edge: 7.5, motd: true, steam: true, sharp: true,
    h2h: [12, 6, 8],
    reasons: [
      "แมนซิตี้ ฟอร์มดีกว่า 5 นัดหลังสุด ชนะ 4 เสมอ 1",
      "ลิเวอร์พูล มีปัญหาผู้เล่นบาดเจ็บในแนวรับ 3 ราย",
      "ราคาบอลไหลเข้าฝั่งแมนซิตี้ต่อเนื่อง",
      "สถิติในบ้านแมนซิตี้แข็งมาก ชนะ 8 จาก 9 เกมหลังสุด",
      "จำนวนเตะมุมเฉลี่ยของทั้งสองทีมสูงกว่าค่าเฉลี่ยลีก",
    ],
    riskFactors: ["รายชื่อตัวจริงยังไม่ประกาศ"],
    alert: "ราคาบอลไหลเข้าฝั่งแมนซิตี้ ต่อเนื่อง 3 ชั่วโมง แนะนำจับตามอง",
    oddsNote: "ราคาต่อไหลลงต่อเนื่อง ตรวจพบ Steam Move",
  }),
  buildFixture({
    id: "fx-rma-fcb", leagueId: "laliga", home: "rma", away: "fcb",
    hour: 22, minute: 0, aiScore: 85, winProb: [48, 26, 26],
    expected: [2, 1], handicap: -0.25, ouLine: 2.75, ouPick: "OVER",
    cornerLine: 10.5, cornerPick: "OVER", riskScore: 38, dataQuality: 78,
    edge: 6.2, h2h: [10, 7, 9],
    reasons: [
      "เรอัลมาดริดไม่แพ้ใครใน 8 นัดหลังสุด",
      "บาร์เซโลนาเสียประตูง่ายเมื่อเล่นนอกบ้าน",
      "สถิติเอลกลาซิโกในบ้านมาดริดเหนือกว่า",
      "ราคาเปิดมาดริดต่อแล้วไหลลงเล็กน้อย",
    ],
    riskFactors: ["เกมดาร์บี้ใหญ่ ความผันผวนสูง", "บาร์เซโลนามีตัวรุกฟอร์มร้อน"],
    oddsNote: "ราคาขยับเข้าฝั่งมาดริดช้า ๆ ไม่มีสัญญาณผิดปกติ",
  }),
  buildFixture({
    id: "fx-bay-bvb", leagueId: "bundesliga", home: "bay", away: "bvb",
    hour: 21, minute: 0, aiScore: 76, winProb: [60, 20, 20],
    expected: [2, 0], handicap: -1, ouLine: 3.0, ouPick: "OVER",
    cornerLine: 10.5, cornerPick: "OVER", riskScore: 30, dataQuality: 74,
    edge: 3.4, h2h: [14, 5, 6],
    reasons: [
      "บาเยิร์นชนะ 4 จาก 5 นัดหลังสุด",
      "ดอร์ทมุนด์ฟอร์มนอกบ้านไม่สม่ำเสมอ",
      "แฮร์รี เคน ทำประตูต่อเนื่อง 6 นัดติด",
      "Der Klassiker ในบ้านบาเยิร์นแพ้น้อยมาก",
    ],
    riskFactors: ["ดอร์ทมุนด์เคยชนะแบบเหนือความคาดหมายในนัดใหญ่"],
    oddsNote: "ราคาต่อ -1 นิ่ง ตลาดมั่นใจฝั่งบาเยิร์น",
  }),
  buildFixture({
    id: "fx-int-acm", leagueId: "seriea", home: "int", away: "acm",
    hour: 22, minute: 15, aiScore: 78, winProb: [57, 23, 20],
    expected: [1, 0], handicap: -0.5, ouLine: 2.25, ouPick: "UNDER",
    cornerLine: 9.5, cornerPick: "UNDER", riskScore: 28, dataQuality: 76,
    edge: 4.1, h2h: [11, 8, 7],
    reasons: [
      "อินเตอร์แนวรับดีที่สุดในลีก เสียเฉลี่ย 0.8 ประตูต่อนัด",
      "มิลานยิงประตูยากเมื่อเจอทีมท็อป 4",
      "ดาร์บี้มิลานมักจบด้วยสกอร์ต่ำในฤดูกาลนี้",
      "เลาตาโร มาร์ติเนซ ฟอร์มร้อน 8 ประตู",
    ],
    riskFactors: ["เกมดาร์บี้ อารมณ์เกมสูง อาจมีใบแดง"],
    oddsNote: "ราคาสูงต่ำไหลลงจาก 2.5 มา 2.25 ตลาดมองสกอร์ต่ำ",
  }),
  buildFixture({
    id: "fx-psg-mar", leagueId: "ligue1", home: "psg", away: "mar",
    hour: 1, minute: 45, aiScore: 81, winProb: [65, 19, 16],
    expected: [3, 1], handicap: -1.5, ouLine: 3.25, ouPick: "OVER",
    cornerLine: 10.5, cornerPick: "OVER", riskScore: 45, dataQuality: 66,
    edge: 2.2, h2h: [16, 4, 5],
    reasons: [
      "เปแอ็สเฌ ชนะรวด 5 นัดหลังสุด ยิงเฉลี่ย 2.6 ประตู",
      "มาร์กเซยแนวรับมีปัญหาตัวเจ็บหลายราย",
      "Le Classique ในบ้าน PSG ชนะ 16 จาก 25 นัด",
    ],
    riskFactors: [
      "ราคาต่อลึก -1.5 ความเสี่ยงแฮนดิแคปสูง",
      "ข้อมูลอาการบาดเจ็บยังไม่ครบ",
      "PSG อาจโรเตชั่นก่อนเกมยุโรป",
    ],
    oddsNote: "ราคาต่อลึกตั้งแต่เปิด ระวังราคาหลอก",
  }),
];

export const matchOfTheDay = fixtures.find((f) => f.isMatchOfTheDay)!;

/* ============================== STATS ============================== */

export const overview: OverviewStats = {
  totalMatches: 128,
  aiRecommended: 24,
  highConfidence: 12,
  valueBets: 8,
  highRisk: 7,
  aiAccuracy7d: 78,
};

export const accuracy: AccuracyStats = {
  overall: 78,
  oneXTwo: 79,
  handicap: 76,
  overUnder: 77,
  corners: 74,
  correctScore: 72,
  last7Days: [
    { date: "จ", accuracy: 74 },
    { date: "อ", accuracy: 81 },
    { date: "พ", accuracy: 76 },
    { date: "พฤ", accuracy: 79 },
    { date: "ศ", accuracy: 72 },
    { date: "ส", accuracy: 83 },
    { date: "อา", accuracy: 80 },
  ],
};

export const leagueById = (id: string): League =>
  leagues.find((l) => l.id === id) ?? leagues[0];
