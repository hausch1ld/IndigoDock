import { z } from "zod";
import {
  weatherLocationSchema,
  type WeatherLocation,
  type WeatherData,
} from "../shared/model";
const number = z.number().finite();
const forecastSchema = z.object({
  current: z.object({
    temperature_2m: number,
    weather_code: number,
    is_day: number,
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(number),
    temperature_2m_min: z.array(number),
    temperature_2m_max: z.array(number),
    precipitation_probability_max: z.array(number.nullable()),
  }),
});
export function parseForecast(raw: unknown): WeatherData {
  const r = forecastSchema.parse(raw),
    d = r.daily;
  if (
    d.time.length < 6 ||
    [
      d.weather_code,
      d.temperature_2m_min,
      d.temperature_2m_max,
      d.precipitation_probability_max,
    ].some((a) => a.length !== d.time.length)
  )
    throw Error("Incomplete weather data");
  return {
    temperature: r.current.temperature_2m,
    code: r.current.weather_code,
    isDay: r.current.is_day === 1,
    updated: Date.now(),
    days: d.time
      .slice(0, 6)
      .map((date, i) => ({
        date,
        code: d.weather_code[i],
        min: d.temperature_2m_min[i],
        max: d.temperature_2m_max[i],
        rain: d.precipitation_probability_max[i] ?? 0,
      })),
  };
}
async function json(url: URL) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });
  if (!r.ok) throw Error("The weather service is currently unavailable.");
  return r.json();
}
export class Weather {
  private cache = new Map<
    string,
    { data?: WeatherData; at: number; pending?: Promise<WeatherData> }
  >();
  async search(raw: unknown): Promise<WeatherLocation[]> {
    const q = z.string().trim().min(2).max(120).parse(raw);
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({
      name: q,
      count: "8",
      language: "de",
      format: "json",
    }).toString();
    const result = z
      .object({
        results: z
          .array(
            z.object({
              name: z.string(),
              admin1: z.string().optional(),
              country: z.string().optional(),
              latitude: number,
              longitude: number,
            }),
          )
          .optional(),
      })
      .parse(await json(url));
    return (result.results ?? []).map((p) =>
      weatherLocationSchema.parse({
        name: [p.name, p.admin1, p.country]
          .filter(Boolean)
          .join(", ")
          .slice(0, 160),
        latitude: p.latitude,
        longitude: p.longitude,
      }),
    );
  }
  async read(location: WeatherLocation | null): Promise<WeatherData | null> {
    if (!location) return null;
    const p = weatherLocationSchema.parse(location),
      key = `${p.latitude},${p.longitude}`,
      old = this.cache.get(key);
    if (old?.pending) return old.pending;
    if (old && Date.now() - old.at < 900000) {
      if (old.data) return old.data;
      throw Error("Weather data is currently unavailable.");
    }
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(p.latitude),
      longitude: String(p.longitude),
      current: "temperature_2m,weather_code,is_day",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      forecast_days: "6",
    }).toString();
    const entry: {
      data?: WeatherData;
      at: number;
      pending?: Promise<WeatherData>;
    } = { data: old?.data, at: Date.now() };
    entry.pending = json(url)
      .then(parseForecast)
      .then((data) => {
        entry.data = data;
        return data;
      })
      .finally(() => {
        entry.pending = undefined;
      });
    this.cache.clear();
    this.cache.set(key, entry);
    try {
      return await entry.pending;
    } catch {
      entry.at = Date.now() - 840000;
      if (entry.data) return entry.data;
      throw Error("Weather data is currently unavailable.");
    }
  }
}
