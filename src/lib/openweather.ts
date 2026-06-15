import { cached } from "./cache";
import { WeatherInfo } from "./types";

/**
 * OpenWeather — พยากรณ์อากาศของเมืองสนามแข่ง ณ ช่วงเวลาใกล้คิกออฟที่สุด
 * (forecast 5 วัน/ราย 3 ชม. มีค่าโอกาสฝน `pop` ให้ตรง ๆ) — fallback เป็น
 * สภาพอากาศปัจจุบันเมื่อคิกออฟไกลเกินช่วงพยากรณ์
 */

const BASE = "https://api.openweathermap.org/data/2.5";

const CONDITION_TH: Record<string, string> = {
  Thunderstorm: "พายุฝนฟ้าคะนอง",
  Drizzle: "ฝนปรอย",
  Rain: "ฝนตก",
  Snow: "หิมะ",
  Clear: "ท้องฟ้าแจ่มใส",
  Clouds: "มีเมฆ",
  Mist: "หมอก",
  Fog: "หมอกหนา",
  Haze: "ฟ้าหลัว",
};

/** ฝน/ลมแรง/อุณหภูมิสุดขั้ว กดเกมรุกและความแม่นยำลง */
export function weatherImpactScore(
  rainProbability: number,
  windKmh: number,
  tempC: number
): number {
  const rain = rainProbability * 0.5;
  const wind = Math.min(40, windKmh) * 0.8;
  const temp = tempC < 2 || tempC > 33 ? 20 : 0;
  return Math.min(100, Math.round(rain + wind + temp));
}

function impactNote(score: number, conditionTh: string): string {
  if (score >= 60) return `${conditionTh} — ผลกระทบสูง ระวังเกมรุกฝืด`;
  if (score >= 35) return `${conditionTh} — ผลกระทบปานกลาง`;
  return `${conditionTh} — ผลกระทบต่ำ`;
}

export async function getMatchWeatherByCity(
  city: string | null | undefined,
  kickoffIso: string
): Promise<WeatherInfo | null> {
  const key = process.env.OPENWEATHER_KEY;
  if (!key || !city) return null;

  // cache ราย เมือง+ชั่วโมงคิกออฟ (3 ชม.)
  return cached(`owm:${city}:${kickoffIso.slice(0, 13)}`, 3 * 3600, async () => {
    try {
      const q = encodeURIComponent(city);
      const res = await fetch(
        `${BASE}/forecast?q=${q}&units=metric&appid=${key}`,
        { signal: AbortSignal.timeout(10_000) }
      );
      const json = (await res.json()) as OwmForecast;

      if (String(json.cod) === "200" && json.list?.length) {
        // เลือกช่วงพยากรณ์ที่ใกล้เวลาคิกออฟที่สุด
        const kickoff = new Date(kickoffIso).getTime() / 1000;
        const slot = json.list.reduce((a, b) =>
          Math.abs(b.dt - kickoff) < Math.abs(a.dt - kickoff) ? b : a
        );
        return toWeatherInfo(
          slot.main.temp,
          Math.round((slot.pop ?? 0) * 100),
          slot.wind.speed,
          slot.main.humidity,
          slot.weather?.[0]?.main ?? "Clouds"
        );
      }

      // fallback: สภาพอากาศปัจจุบัน
      const cur = await fetch(
        `${BASE}/weather?q=${q}&units=metric&appid=${key}`,
        { signal: AbortSignal.timeout(10_000) }
      );
      const cj = (await cur.json()) as OwmCurrent;
      if (String(cj.cod) !== "200") return null;
      return toWeatherInfo(
        cj.main.temp,
        cj.rain ? 70 : (cj.clouds?.all ?? 0) > 80 ? 40 : 10,
        cj.wind.speed,
        cj.main.humidity,
        cj.weather?.[0]?.main ?? "Clouds"
      );
    } catch (err) {
      console.error(`[openweather] ${city}:`, (err as Error).message);
      return null;
    }
  });
}

function toWeatherInfo(
  tempC: number,
  rainProbability: number,
  windMs: number,
  humidity: number,
  condition: string
): WeatherInfo {
  const windKmh = Math.round(windMs * 3.6);
  const score = weatherImpactScore(rainProbability, windKmh, tempC);
  const conditionTh = CONDITION_TH[condition] ?? condition;
  return {
    hasData: true,
    temperatureC: Math.round(tempC),
    rainProbability,
    windKmh,
    humidity,
    impactScore: score,
    impactNote: impactNote(score, conditionTh),
  };
}

/* ---- raw shapes (subset) ---- */
interface OwmForecast {
  cod: string | number;
  list?: {
    dt: number;
    pop?: number;
    main: { temp: number; humidity: number };
    wind: { speed: number };
    weather?: { main: string }[];
  }[];
}

interface OwmCurrent {
  cod: string | number;
  main: { temp: number; humidity: number };
  wind: { speed: number };
  clouds?: { all: number };
  rain?: Record<string, number>;
  weather?: { main: string }[];
}
