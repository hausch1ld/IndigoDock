import { WeatherWidget } from "./weather";
import { CalendarWidget } from "./calendar";
import React, { useState, useEffect, useRef } from "react";
import {
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Play,
  Pause,
} from "lucide-react";
import type { Bridge, Command, Config, WidgetData } from "../shared/model";
import { insertAt } from "../shared/dock";
function Slider({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (n: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editing = useRef(false);
  useEffect(() => {
    if (!editing.current) setDraft(value);
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <input
      aria-label={label}
      type="range"
      min="0"
      max="100"
      value={Math.round(draft * 100)}
      onChange={(e) => {
        const next = Number(e.target.value) / 100;
        editing.current = true;
        setDraft(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          onChange(next);
          editing.current = false;
        }, 180);
      }}
    />
  );
}
export function WidgetBoard({
  sidebar,
  api,
  send,
}: {
  sidebar: Config["sidebar"];
  api: Bridge;
  send: (c: Command) => Promise<void>;
}) {
  const interactive = useRef(false);
  const [notes, setNotes] = useState(sidebar.notes);
  const notesField = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (document.activeElement !== notesField.current) setNotes(sidebar.notes);
  }, [sidebar.notes]);
  const [data, setData] = useState<WidgetData>();
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());
  const [drag, setDrag] = useState<string | null>(null);
  const [drop, setDrop] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const value = await api.widgets();
        if (active) setData(value);
      } catch {
        if (active) setError("Widget-Daten konnten nicht geladen werden.");
      } finally {
        if (active) timer = setTimeout(poll, 2500);
      }
    };
    void poll();
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, []);
  const act = (c: Command) => {
    setError("");
    void send(c)
      .then(async () => {
        if (c.type === "spotifyControl") setData(await api.widgets());
      })
      .catch(() =>
        setError("Aktion fehlgeschlagen. Dienst und Audioausgabe prüfen."),
      );
  };
  const names = {
    clock: "Uhr",
    spotify: "Spotify",
    performance: "Systemauslastung",
    mixer: "Windows-Lautstärkemixer",
    notes: "Notizen",
    calendar: "Kalender",
    weather: "Wetter",
  };
  const sessions = [
    ...new Map((data?.mixer ?? []).map((s) => [s.pid, s])).values(),
  ];
  return (
    <div
      className="widget-board"
      style={
        {
          background: sidebar.background,
          color: sidebar.textColor,
          "--widget-background": sidebar.widgetBackground,
          "--widget-text": sidebar.textColor,
        } as React.CSSProperties
      }
    >
      {error && <p role="status">{error}</p>}
      {sidebar.widgets.map((kind, index) => (
        <section
          className={
            "widget-card " +
            (drop === index ? "drop-before " : "") +
            (drop === index + 1 && index === sidebar.widgets.length - 1
              ? "drop-after"
              : "")
          }
          key={kind}
          data-widget={kind}
          aria-label={names[kind]}
          tabIndex={0}
          draggable
          onPointerDownCapture={(e) => {
            interactive.current = !!(e.target as HTMLElement).closest(
              "button,input,textarea,select,a,label",
            );
            e.currentTarget.draggable = !interactive.current;
          }}
          onKeyDown={(e) => {
            if (
              e.target !== e.currentTarget ||
              !["ArrowUp", "ArrowDown"].includes(e.key)
            )
              return;
            e.preventDefault();
            act({
              type: "sidebar",
              patch: {
                widgets: insertAt(
                  sidebar.widgets,
                  kind,
                  e.key === "ArrowUp" ? index - 1 : index + 2,
                ) as Config["sidebar"]["widgets"],
              },
            });
          }}
          onDragStart={(e) => {
            if (interactive.current) {
              e.preventDefault();
              return;
            }
            e.stopPropagation();
            setDrag(kind);
            e.dataTransfer.setData("text/plain", kind);
          }}
          onDragEnd={() => {
            setDrag(null);
            setDrop(null);
          }}
          onDragOver={(e) => {
            if (!drag) return;
            e.preventDefault();
            e.stopPropagation();
            const b = e.currentTarget.getBoundingClientRect();
            setDrop(index + (e.clientY > b.y + b.height / 2 ? 1 : 0));
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (drag)
              act({
                type: "sidebar",
                patch: {
                  widgets: insertAt(
                    sidebar.widgets,
                    drag,
                    drop ?? index,
                  ) as Config["sidebar"]["widgets"],
                },
              });
            setDrag(null);
            setDrop(null);
          }}
        >
          {kind === "weather" && (
            <WeatherWidget
              api={api}
              location={sidebar.weatherLocation}
              onLocation={(p) =>
                act({ type: "sidebar", patch: { weatherLocation: p } })
              }
            />
          )}
          {kind === "calendar" && <CalendarWidget now={now} />}
          {kind === "notes" && (
            <textarea
              ref={notesField}
              className="notes-widget"
              aria-label="Notizen"
              placeholder="Notizen …"
              rows={6}
              maxLength={20000}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                act({ type: "sidebar", patch: { notes: e.target.value } });
              }}
            />
          )}
          {kind === "clock" && (
            <div className="clock-widget">
              <strong>{now.toLocaleTimeString("de-DE")}</strong>
              <span>
                {now.toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
          {kind === "performance" && (
            <>
              <div className="metric">
                <span>CPU</span>
                <strong>{data ? data.cpu + " %" : "…"}</strong>
                <progress max="100" value={data?.cpu ?? 0} />
              </div>
              <div className="metric">
                <span>Arbeitsspeicher</span>
                <strong>{data ? data.memory + " %" : "…"}</strong>
                <progress max="100" value={data?.memory ?? 0} />
              </div>
              <div className="metric">
                <span title={data?.gpuName}>GPU</span>
                <strong>
                  {data?.gpu === undefined
                    ? "Nicht verfügbar"
                    : data.gpu + " %"}
                </strong>
                <progress max="100" value={data?.gpu ?? 0} />
              </div>
            </>
          )}
          {kind === "spotify" && (
            <>
              {data?.spotify?.title ? (
                <div className="spotify-summary">
                  {data.spotify.cover && (
                    <img
                      draggable={false}
                      src={data.spotify.cover}
                      alt="Albumcover"
                    />
                  )}
                  <div>
                    <strong>{data.spotify.title}</strong>
                    <span>{data.spotify.artist}</span>
                  </div>
                </div>
              ) : (
                <p>Starte einen Titel im Spotify-Dienst.</p>
              )}
              <div className="player-controls">
                <button
                  className="player-secondary"
                  title="Shuffle"
                  aria-pressed={!!data?.spotify?.shuffle}
                  disabled={!data?.spotify}
                  onClick={() =>
                    act({ type: "spotifyControl", action: "shuffle" })
                  }
                >
                  <Shuffle size={15} />
                </button>
                <button
                  title="Vorheriger Titel"
                  disabled={!data?.spotify}
                  onClick={() =>
                    act({ type: "spotifyControl", action: "previous" })
                  }
                >
                  <SkipBack size={18} />
                </button>
                <button
                  className="player-play"
                  title={
                    data?.spotify?.paused === false ? "Pause" : "Wiedergabe"
                  }
                  disabled={!data?.spotify}
                  onClick={() =>
                    act({ type: "spotifyControl", action: "toggle" })
                  }
                >
                  {data?.spotify?.paused !== false ? (
                    <Play size={20} />
                  ) : (
                    <Pause size={20} />
                  )}
                </button>
                <button
                  title="Nächster Titel"
                  disabled={!data?.spotify}
                  onClick={() =>
                    act({ type: "spotifyControl", action: "next" })
                  }
                >
                  <SkipForward size={18} />
                </button>
                <button
                  className="player-secondary"
                  title="Wiederholen"
                  aria-pressed={!!data?.spotify?.repeat}
                  disabled={!data?.spotify}
                  onClick={() =>
                    act({ type: "spotifyControl", action: "repeat" })
                  }
                >
                  {data?.spotify?.repeatOne ? (
                    <Repeat1 size={15} />
                  ) : (
                    <Repeat size={15} />
                  )}
                </button>
              </div>
              {data?.spotify?.available && (
                <div className="spotify-volume">
                  <button
                    title={
                      data.spotify.volume > 0
                        ? "Stummschalten"
                        : "Stummschaltung aufheben"
                    }
                    aria-pressed={data.spotify.volume === 0}
                    onClick={() =>
                      act({ type: "spotifyControl", action: "mute" })
                    }
                  >
                    {data.spotify.volume > 0 ? (
                      <Volume2 size={18} />
                    ) : (
                      <VolumeX size={18} />
                    )}
                  </button>
                  <Slider
                    label="Spotify-Lautstärke"
                    value={data.spotify.volume}
                    onChange={(value) =>
                      act({ type: "spotifyControl", action: "volume", value })
                    }
                  />
                </div>
              )}
            </>
          )}
          {kind === "mixer" && (
            <>
              {data?.mixerError ? (
                <p>{data.mixerError}</p>
              ) : sessions.length ? (
                sessions.map((s) => (
                  <label className="mixer-row" key={s.pid}>
                    <span>
                      {s.name}
                      {s.muted ? " · stumm" : ""}
                    </span>
                    <small>{Math.round(s.volume * 100)} %</small>
                    <Slider
                      label={s.name + " Lautstärke"}
                      value={s.volume}
                      onChange={(value) =>
                        act({ type: "mixerVolume", pid: s.pid, value })
                      }
                    />
                  </label>
                ))
              ) : (
                <p>Keine aktiven Audiositzungen.</p>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
