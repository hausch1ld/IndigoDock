import React, { useEffect, useState } from "react";
import {
  Settings,
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Moon,
  Droplets,
  X,
} from "lucide-react";
import type { Bridge, WeatherLocation, WeatherData } from "../shared/model";
export function condition(code: number) {
  if (code === 0) return "Sonnig";
  if (code === 1) return "Überwiegend sonnig";
  if (code === 2) return "Teilweise bewölkt";
  if (code === 3) return "Bewölkt";
  if (code <= 48) return "Nebel";
  if (code <= 57) return "Nieselregen";
  if (code <= 67) return "Regen";
  if (code <= 77) return "Schnee";
  if (code <= 82) return "Regenschauer";
  if (code <= 86) return "Schneeschauer";
  return "Gewitter";
}
function WeatherIcon({
  code,
  night = false,
  size = 48,
}: {
  code: number;
  night?: boolean;
  size?: number;
}) {
  const Icon =
    code === 0
      ? night
        ? Moon
        : Sun
      : code <= 2
        ? CloudSun
        : code === 3
          ? Cloud
          : code <= 48
            ? CloudFog
            : code <= 57
              ? CloudDrizzle
              : code <= 67
                ? CloudRain
                : code <= 77
                  ? CloudSnow
                  : code <= 82
                    ? CloudRain
                    : code <= 86
                      ? CloudSnow
                      : CloudLightning;
  return (
    <Icon
      className={"weather-icon " + (code <= 2 ? "weather-sun" : "")}
      size={size}
      strokeWidth={1.6}
      aria-hidden="true"
    />
  );
}
export function LocationChooser({
  api,
  onSelect,
  onClose,
}: {
  api: Bridge;
  onSelect: (p: WeatherLocation) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<WeatherLocation[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="location-chooser">
      <div className="location-heading">
        <strong>Standort auswählen</strong>
        <button
          type="button"
          title="Standortauswahl schließen"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setResults([]);
          try {
            const r = await api.weatherSearch(query);
            setResults(r);
            if (!r.length) setError("Kein Ort gefunden.");
          } catch {
            setError("Ortssuche nicht verfügbar. Bitte erneut versuchen.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          aria-label="Ort suchen"
          placeholder="Stadt oder Postleitzahl"
          minLength={2}
          maxLength={120}
          required
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Suche …" : "Suchen"}
        </button>
      </form>
      {error && <p role="status">{error}</p>}
      <div className="location-results">
        {results.map((p) => (
          <button
            type="button"
            key={`${p.latitude},${p.longitude}`}
            onClick={() => onSelect(p)}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
export function WeatherWidget({
  api,
  location,
  onLocation,
}: {
  api: Bridge;
  location: WeatherLocation | null;
  onLocation: (p: WeatherLocation) => void;
}) {
  const [edit, setEdit] = useState(false),
    [data, setData] = useState<WeatherData | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    const read = async () => {
      try {
        const d = await api.weather();
        if (active) {
          setData(d);
          setError("");
        }
      } catch {
        if (active) setError("Wetter momentan nicht verfügbar.");
      }
    };
    if (location) void read();
    const timer = setInterval(read, 900000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [location?.latitude, location?.longitude]);
  if (edit)
    return (
      <LocationChooser
        api={api}
        onClose={() => setEdit(false)}
        onSelect={(p) => {
          onLocation(p);
          setEdit(false);
        }}
      />
    );
  if (!location)
    return (
      <button className="weather-setup" onClick={() => setEdit(true)}>
        <Settings size={24} />
        <span>Standort auswählen</span>
      </button>
    );
  return (
    <div className="weather-widget">
      <div className="weather-heading">
        <strong title={location.name}>{location.name.split(",")[0]}</strong>
      </div>
      <small className="weather-credit">
        <button
          onClick={() =>
            void api.command({ type: "infoLink", page: "weather" })
          }
        >
          Wetterdaten: Open-Meteo
        </button>{" "}
        ·{" "}
        <button
          title="Temperaturen gerundet; Lizenz CC BY 4.0"
          onClick={() =>
            void api.command({ type: "infoLink", page: "weatherLicense" })
          }
        >
          CC BY 4.0
        </button>
      </small>
      {data ? (
        <>
          <div className="weather-current">
            <WeatherIcon code={data.code} night={!data.isDay} />
            <strong className="weather-temperature">
              {Math.round(data.temperature)}
              <small>°C</small>
            </strong>
            <div className="weather-details">
              <span>
                {data.code === 0 && !data.isDay ? "Klar" : condition(data.code)}
              </span>
              <span>
                {Math.round(data.days[0].min)}° / {Math.round(data.days[0].max)}
                °
              </span>
              <span title="Regenwahrscheinlichkeit heute">
                <Droplets size={13} />
                {Math.round(data.days[0].rain)} %
              </span>
            </div>
          </div>
          <div className="weather-days">
            {data.days.slice(1, 6).map((d) => (
              <div
                key={d.date}
                title={`${condition(d.code)} · ${Math.round(d.min)}° bis ${Math.round(d.max)}°`}
              >
                <span>
                  {new Date(d.date + "T12:00:00").toLocaleDateString("de-DE", {
                    weekday: "short",
                  })}
                </span>
                <WeatherIcon code={d.code} size={28} />
                <strong>{Math.round(d.max)}°</strong>
              </div>
            ))}
          </div>
          {Date.now() - data.updated > 1800000 && (
            <small>
              Letzter Stand:{" "}
              {new Date(data.updated).toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          )}
        </>
      ) : (
        <p role="status">{error || "Wetter wird geladen …"}</p>
      )}
    </div>
  );
}
