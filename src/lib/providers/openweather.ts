import { WeatherProvider, providerFetch } from "./provider";
import { WeatherInfo } from "../types";

/** OpenWeather adapter — temperature, rain, wind, humidity → impact score. */
export class OpenWeatherProvider implements WeatherProvider {
  readonly name = "openweather";
  private base = "https://api.openweathermap.org/data/2.5";

  constructor(private apiKey: string) {}

  async getMatchWeather(lat: number, lon: number): Promise<WeatherInfo> {
    const raw = (await providerFetch(
      this.name,
      `${this.base}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${this.apiKey}`
    )) as OwmResponse;

    const rainProbability = raw.rain ? 70 : raw.clouds.all > 80 ? 40 : 10;
    const windKmh = Math.round(raw.wind.speed * 3.6);
    const impactScore = weatherImpactScore(rainProbability, windKmh, raw.main.temp);

    return {
      temperatureC: Math.round(raw.main.temp),
      rainProbability,
      windKmh,
      humidity: raw.main.humidity,
      impactScore,
      impactNote:
        impactScore >= 60
          ? "สภาพอากาศมีผลกระทบสูง ระวังเกมรุกฝืด"
          : impactScore >= 35
            ? "สภาพอากาศมีผลกระทบปานกลาง"
            : "สภาพอากาศมีผลกระทบต่ำ",
    };
  }
}

/** Heavier rain/wind and extreme temperatures reduce attacking output. */
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

interface OwmResponse {
  main: { temp: number; humidity: number };
  wind: { speed: number };
  clouds: { all: number };
  rain?: Record<string, number>;
}
