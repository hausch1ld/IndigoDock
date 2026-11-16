import { sidebarWidth } from "../shared/sidebar";
import { WidgetBoard } from "./widgets";
import React, { useEffect, useState, useRef, memo } from "react";
import { createRoot } from "react-dom/client";
import {
  PanelRightOpen,
  PanelRightClose,
  Columns3,
  Plus,
  Settings,
  Minus,
  Square,
  X,
  RotateCw,
  Play,
  ExternalLink,
  Volume2,
  GripVertical,
  ChevronDown,
  Shield,
  LayoutDashboard,
  Power,
  Search,
  Check,
  Menu,
} from "lucide-react";
import type { Bridge, Snapshot, Service, Command } from "../shared/model";
import { serviceSchema } from "../shared/model";
import { bounds, resizePair, TOP, TABS, BOTTOM } from "../shared/layout";
import "./style.css";
import { dockGroups, reordered, insertAt } from "../shared/dock";
import { groupIds } from "../shared/groups";
declare global {
  interface Window {
    multidock: Bridge;
  }
}
const api = window.multidock;
const Clock = memo(function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      clearTimeout(timer);
      setNow(new Date());
      timer = setTimeout(tick, 60000 - (Date.now() % 60000));
    };
    tick();
    const sync = () => tick();
    window.addEventListener("focus", sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", sync);
    };
  }, []);
  return (
    <time>
      <strong>
        {now.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </strong>
      <span>
        {now.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
      </span>
    </time>
  );
});
function Icon({ service }: { service: Service }) {
  return service.icon ? (
    <img
      draggable={false}
      src={
        service.icon.startsWith("/icons/") ? "." + service.icon : service.icon
      }
      alt=""
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  ) : (
    <span className="letter">{service.name.slice(0, 2)}</span>
  );
}
function App() {
  const [state, setState] = useState<Snapshot>();
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<
    "layout" | "settings" | "add" | "known" | "inactive" | null
  >(null);
  const [edit, setEdit] = useState<Service | null>(null);
  const [groupContext, setGroupContext] = useState<{
    id: string;
    x: number;
  } | null>(null);
  const [dockDrop, setDockDrop] = useState<{
    id: string;
    after: boolean;
  } | null>(null);
  const [choose, setChoose] = useState<string | null>(null),
    [drag, setDrag] = useState<string | null>(null),
    [hover, setHover] = useState<number | null>(null),
    [context, setContext] = useState<{ id: string; x: number } | null>(null);
  const [size, setSize] = useState({ width: innerWidth, height: innerHeight }),
    [draftRatios, setDraftRatios] = useState<number[] | null>(null);
  const queue = useRef(Promise.resolve());
  const send = (cmd: Command) => {
    const next = queue.current.then(() => api.command(cmd));
    queue.current = next.catch((e) =>
      setError(String(e).replace(/^Error:.*?: /, "")),
    );
    return next;
  };
  useEffect(() => {
    api
      .snapshot()
      .then(setState)
      .catch((e) => setError(String(e)));
    return api.subscribe(setState);
  }, []);
  useEffect(() => {
    const resize = () => setSize({ width: innerWidth, height: innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const close = () => {
    setDockDrop(null);
    setGroupContext(null);
    setPanel(null);
    setEdit(null);
    setChoose(null);
    setDrag(null);
    setContext(null);
    setHover(null);
  };
  const overlay = !!(
    panel ||
    edit ||
    choose ||
    drag ||
    context ||
    groupContext ||
    error ||
    state?.persistenceError
  );
  useEffect(() => {
    void send({ type: "overlay", visible: overlay }).catch(() => {});
  }, [overlay]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  if (!state)
    return <main className="boot">IndigoDock {error || "startet …"}</main>;
  const c = state.config,
    l = c.layouts[c.count],
    ratios = draftRatios ?? l.ratios,
    rects = bounds(
      size.width,
      size.height,
      ratios,
      c.settings.showColumnTabs,
      c.settings.dockPosition,
      sidebarWidth(size.width, c.sidebar.open),
    );
  const contentTop = TOP + (c.settings.dockPosition === "top" ? BOTTOM : 0);
  const contentBottom = c.settings.dockPosition === "bottom" ? BOTTOM : 0;
  const groupedIds = new Set(c.groups.flatMap((g) => groupIds(g.layout)));
  const groups = dockGroups(
    c.services.filter((s) => !groupedIds.has(s.id)),
    c.settings,
  );
  const service = (id: string | null) => c.services.find((s) => s.id === id);
  const action = (
    s: Service,
    action: Extract<Command, { type: "service" }>["action"],
  ) => void send({ type: "service", id: s.id, action }).catch(() => {});
  const open = (s: Service) => {
    close();
    if (c.activeGroup) {
      void send({ type: "solo", id: s.id }).catch(() => {});
      return;
    }
    if (!s.url && s.kind !== "widgets") {
      setEdit(s);
      return;
    }
    if (!s.running) {
      setContext({ id: s.id, x: size.width / 2 });
      return;
    }
    if (c.count === 1)
      void send({ type: "assign", id: s.id, column: 0 }).catch(() => {});
    else setChoose(s.id);
  };
  const place = (id: string, i: number, startIfStopped = false) => {
    void send({ type: "assign", id, column: i, startIfStopped }).catch(
      () => {},
    );
    close();
  };
  const dragStart = (e: React.DragEvent, s: Service) => {
    close();
    e.dataTransfer.setData("text/plain", s.id);
    e.dataTransfer.effectAllowed = "move";
    setPanel(null);
    setDrag(s.id);
    setChoose(null);
  };
  const reorder = (id: string, target: string) => {
    const all = c.services.map((s) => s.id);
    const ids = insertAt(
      all,
      id,
      all.indexOf(target) + (dockDrop?.id === target && dockDrop.after ? 1 : 0),
    );
    void send({ type: "reorder", ids }).catch(() => {});
    close();
  };
  const startResize = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const x = e.clientX,
      initial = [...ratios];
    let latest = initial,
      frame = 0;
    const el = e.currentTarget;
    const move = (ev: Event) => {
      latest = resizePair(
        initial,
        index,
        (ev as PointerEvent).clientX - x,
        size.width -
          sidebarWidth(size.width, c.sidebar.open) -
          (["left", "right"].includes(c.settings.dockPosition) ? BOTTOM : 0),
      );
      setDraftRatios(latest);
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          void send({ type: "ratios", ratios: latest }).catch(() => {});
        });
    };
    const end = () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      void send({ type: "ratios", ratios: latest })
        .then(() => api.snapshot())
        .then((s) => {
          setState(s);
          setDraftRatios(null);
        })
        .catch(() => setDraftRatios(null));
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  };
  const renderService = (s: Service) => {
    const active = l.columns.some((col) => col.active === s.id);
    return (
      <button
        aria-label={s.name}
        key={s.id}
        title={`${s.name} · ${s.running ? "Gestartet" : "Gestoppt"}${s.muted ? " · Stumm" : ""}`}
        className={`service ${active ? "active" : ""} ${s.running ? "running" : "stopped"} ${dockDrop?.id === s.id ? (dockDrop.after ? "dock-drop-after" : "dock-drop-before") : ""}`}
        draggable
        onDragStart={(e) => dragStart(e, s)}
        onDragEnd={close}
        onDragOver={(e) => {
          e.preventDefault();
          const b = e.currentTarget.getBoundingClientRect();
          const vertical = ["left", "right"].includes(c.settings.dockPosition);
          setDockDrop({
            id: s.id,
            after: vertical
              ? e.clientY > b.y + b.height / 2
              : e.clientX > b.x + b.width / 2,
          });
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (drag && drag !== s.id) reorder(drag, s.id);
        }}
        onClick={() => open(s)}
        onContextMenu={(e) => {
          e.preventDefault();
          close();
          setContext({ id: s.id, x: e.clientX });
        }}
      >
        <Icon service={s} />
        {s.running &&
          (!c.settings.groupActive ||
            state.status[s.id]?.state === "error") && (
            <span
              className={
                "status-dot " +
                (state.status[s.id]?.state === "error" ? "error-dot" : "")
              }
            />
          )}
        {state.status[s.id]?.audible && !s.muted && (
          <Volume2 className="audio-dot" size={10} />
        )}
      </button>
    );
  };
  return (
    <div
      className={
        "app dock-" +
        c.settings.dockPosition +
        " " +
        (!c.settings.showColumnTabs ? "tabs-hidden" : "")
      }
    >
      <header className="titlebar">
        <div className="brand">
          <img className="app-logo" src="./icons/indigodock.png" alt="" />
          IndigoDock
        </div>
        <div className="window-actions">
          <button
            title="Einstellungen"
            onClick={() => {
              close();
              setPanel("settings");
            }}
          >
            <Settings size={15} />
          </button>
          <button
            title={c.sidebar.open ? "Sidebar einklappen" : "Sidebar ausklappen"}
            aria-pressed={c.sidebar.open}
            onClick={() => {
              close();
              void send({ type: "sidebar", patch: { open: !c.sidebar.open } });
            }}
          >
            {c.sidebar.open ? (
              <PanelRightClose size={17} />
            ) : (
              <PanelRightOpen size={17} />
            )}
          </button>
          <button
            title="Minimieren"
            onClick={() => void send({ type: "window", action: "minimize" })}
          >
            <Minus size={16} />
          </button>
          <button
            title="Maximieren / Wiederherstellen"
            onClick={() => void send({ type: "window", action: "maximize" })}
          >
            <Square size={12} />
          </button>
          <button
            className="close-window"
            title="Schließen"
            onClick={() => void send({ type: "window", action: "close" })}
          >
            <X size={17} />
          </button>
        </div>
      </header>
      {c.sidebar.open && (
        <aside
          className="widget-sidebar"
          aria-label="Widget-Sidebar"
          style={{
            top: contentTop,
            bottom: contentBottom,
            right: c.settings.dockPosition === "right" ? BOTTOM : 0,
            width: sidebarWidth(size.width, true),
          }}
        >
          <WidgetBoard sidebar={c.sidebar} api={api} send={send} />
        </aside>
      )}
      <main className="workspace">
        {rects.map((b, i) => {
          const col = l.columns[i],
            s = service(col.active),
            status = s ? state.status[s.id] : undefined;
          return (
            <section
              key={i}
              className={
                "column " +
                (s?.running && status?.state !== "error" ? "live" : "")
              }
              style={{
                left: b.x,
                width: b.width,
                top: contentTop,
                height: size.height - contentTop - contentBottom,
              }}
            >
              {c.settings.showColumnTabs && (
                <div className="column-tabs">
                  <span className="column-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="tabs-scroll">
                    {col.services.map((id) => {
                      const tab = service(id);
                      return (
                        tab && (
                          <button
                            key={id}
                            className={
                              id === col.active ? "tab selected" : "tab"
                            }
                            onClick={() => place(id, i)}
                            title={tab.name}
                          >
                            <Icon service={tab} />
                            <span>{tab.name}</span>
                            {tab.muted && <span>· stumm</span>}
                          </button>
                        )
                      );
                    })}
                  </div>
                  {s && (
                    <button
                      title="Neu laden"
                      disabled={!s.running}
                      onClick={() => action(s, "reload")}
                    >
                      <RotateCw size={13} />
                    </button>
                  )}
                </div>
              )}
              <div className="column-body">
                {overlay && s && state.captures?.[s.id] && (
                  <img className="capture" src={state.captures[s.id]} alt="" />
                )}
                {(!s || !s.running || status?.state === "error") && (
                  <div className="empty">
                    {s ? (
                      <>
                        <div className="empty-service">
                          <Icon service={s} />
                        </div>
                        <h2>{s.name}</h2>
                        <p>{status?.error || "Dieser Dienst ist gestoppt."}</p>
                        <button
                          className="primary"
                          onClick={() =>
                            action(s, s.running ? "reload" : "start")
                          }
                        >
                          {s.running ? (
                            <RotateCw size={15} />
                          ) : (
                            <Play size={15} />
                          )}{" "}
                          {s.running ? "Erneut versuchen" : "Dienst starten"}
                        </button>
                        <button
                          className="text-button"
                          onClick={() => action(s, "external")}
                        >
                          Im Browser öffnen <ExternalLink size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="empty-symbol">
                          <Columns3 size={30} />
                        </div>
                        <h1>{`Spalte ${i + 1}`}</h1>
                        <p>Dienst hierher ziehen oder unten auswählen.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              {status?.state === "loading" && <div className="loading-bar" />}
            </section>
          );
        })}
        {rects.slice(0, -1).map((b, i) => (
          <div
            role="separator"
            aria-label={`Spaltentrenner ${i + 1}`}
            aria-orientation="vertical"
            tabIndex={0}
            key={i}
            className="splitter"
            style={{
              left: b.x + b.width,
              top: contentTop,
              bottom: contentBottom,
            }}
            onPointerDown={(e) => startResize(e, i)}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
                void send({
                  type: "ratios",
                  ratios: resizePair(
                    ratios,
                    i,
                    e.key === "ArrowLeft" ? -20 : 20,
                    size.width -
                      sidebarWidth(size.width, c.sidebar.open) -
                      (["left", "right"].includes(c.settings.dockPosition)
                        ? BOTTOM
                        : 0),
                  ),
                });
              }
            }}
          >
            <span />
          </div>
        ))}
      </main>
      {(choose || drag) && (
        <div
          className="targets"
          style={{ top: contentTop, bottom: contentBottom }}
          onClick={close}
        >
          {rects.map((b, i) => (
            <button
              key={i}
              className={"target " + (hover === i ? "hover" : "")}
              style={{ left: b.x, width: b.width }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onDragOver={(e) => {
                e.preventDefault();
                setHover(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = drag || e.dataTransfer.getData("text/plain");
                if (service(id)) place(id, i, true);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (choose) place(choose, i);
              }}
            >
              <span className="target-card">
                <Columns3 size={24} />
                <strong>Spalte {i + 1}</strong>
                <small>{service(choose || drag)?.name} hier anzeigen</small>
              </span>
            </button>
          ))}
        </div>
      )}
      <footer
        className="dock"
        onClickCapture={close}
        onContextMenuCapture={close}
      >
        <div className="dock-left">
          <button
            className={"layout-trigger " + (panel === "layout" ? "active" : "")}
            title="Spaltenlayout"
            onClick={() => setPanel(panel === "layout" ? null : "layout")}
          >
            <Columns3 size={21} />
            <span>{c.count}</span>
            <ChevronDown size={12} />
          </button>
        </div>
        <nav className="services" aria-label="Dienste">
          {c.groups.map((g) => (
            <button
              key={g.id}
              className={
                "dock-group " + (c.activeGroup === g.id ? "selected" : "")
              }
              title={g.name}
              aria-label={"Gruppe: " + g.name}
              onClick={() => {
                close();
                void send({ type: "activateGroup", id: g.id }).catch(() => {});
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                close();
                setGroupContext({ id: g.id, x: e.clientX });
              }}
            >
              {groupIds(g.layout).map((id) => {
                const s = service(id);
                return s ? (
                  <span
                    key={id}
                    className={
                      "group-service " + (s.running ? "running" : "stopped")
                    }
                  >
                    <Icon service={s} />
                  </span>
                ) : null;
              })}
            </button>
          ))}
          {groups.primary.map(renderService)}
          {groups.separator && (
            <span className="dock-separator" role="separator" />
          )}
          {groups.secondary.map(renderService)}
          {c.settings.hideInactive && groups.inactive.length > 0 && (
            <button
              className="inactive-trigger"
              title="Inaktive Apps"
              aria-label="Inaktive Apps"
              onClick={() => setPanel(panel === "inactive" ? null : "inactive")}
            >
              <Menu size={21} />
            </button>
          )}
        </nav>
        <div className="dock-right">
          <Clock />
        </div>
      </footer>
      {(panel || context || edit || groupContext) && (
        <div
          className="scrim"
          style={{
            top: contentTop,
            bottom: contentBottom,
            left: c.settings.dockPosition === "left" ? BOTTOM : 0,
            right: c.settings.dockPosition === "right" ? BOTTOM : 0,
          }}
          onClick={close}
        />
      )}
      {groupContext && (
        <div
          className="context-menu popover"
          style={{
            left: Math.min(
              size.width - 240,
              Math.max(10, groupContext.x - 105),
            ),
          }}
        >
          <button
            onClick={() => {
              void send({ type: "activateGroup", id: groupContext.id });
              close();
            }}
          >
            Gruppe anzeigen
          </button>
          <button
            onClick={() => {
              void send({ type: "deleteGroup", id: groupContext.id });
              close();
            }}
          >
            Gruppe löschen
          </button>
        </div>
      )}
      {panel === "layout" && (
        <div className="layout-menu popover">
          <span className="eyebrow">DEIN WORKSPACE</span>
          <button
            className="save-group"
            disabled={l.columns.some((col) => !col.active)}
            onClick={() => {
              void send({ type: "saveGroup" }).catch(() => {});
              close();
            }}
          >
            Als Gruppe speichern
          </button>
          <div className="layout-options">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                className={c.count === n ? "chosen" : ""}
                onClick={() => {
                  void send({ type: "layout", count: n });
                  close();
                }}
              >
                <span className="layout-preview">
                  {Array.from({ length: n }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
                <span>
                  {n} {n === 1 ? "Spalte" : "Spalten"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {panel === "inactive" && (
        <div className="inactive-menu popover">
          <h3>Inaktive Apps</h3>
          {groups.inactive.map((s) => (
            <button
              key={s.id}
              draggable
              onDragStart={(e) => dragStart(e, s)}
              onDragEnd={close}
              onContextMenu={(e) => {
                e.preventDefault();
                setPanel(null);
                setContext({ id: s.id, x: e.clientX });
              }}
              onClick={() => {
                if (c.activeGroup) {
                  close();
                  void send({ type: "solo", id: s.id }).catch(() => {});
                  return;
                }
                void send({ type: "service", id: s.id, action: "start" })
                  .then(() => {
                    setPanel(null);
                    if (c.count === 1) place(s.id, 0);
                    else setChoose(s.id);
                  })
                  .catch(() => {});
              }}
            >
              <Icon service={s} />
              <span>{s.name}</span>
              <Play size={13} />
            </button>
          ))}
        </div>
      )}
      {context &&
        (() => {
          const s = service(context.id);
          return (
            s && (
              <div
                className="context-menu popover"
                style={{
                  left: Math.min(
                    size.width - 240,
                    Math.max(10, context.x - 105),
                  ),
                }}
              >
                <div className="context-heading">
                  <Icon service={s} />
                  <div>
                    <strong>{s.name}</strong>
                    <small>
                      {s.running ? "Läuft im Hintergrund weiter" : "Gestoppt"}
                    </small>
                  </div>
                </div>
                {(
                  [
                    { label: "Starten", key: "start", disabled: s.running },
                    { label: "Stoppen", key: "stop", disabled: !s.running },
                    {
                      label: "Element ausblenden",
                      key: "hideElement",
                      disabled: !s.running || s.kind === "widgets",
                    },
                    { label: "Neu laden", key: "reload", disabled: !s.running },
                    {
                      label: s.muted ? "Ton einschalten" : "Stummschalten",
                      key: "mute",
                    },
                    { label: "Start-URL wiederherstellen", key: "reset" },
                    { label: "Im Browser öffnen", key: "external" },
                  ] as const
                ).map((a) => (
                  <button
                    key={a.key}
                    disabled={"disabled" in a && a.disabled}
                    onClick={() => {
                      action(s, a.key);
                      close();
                    }}
                  >
                    {a.label}
                  </button>
                ))}
                <hr />
                <button
                  onClick={() => {
                    setContext(null);
                    setEdit(s);
                  }}
                >
                  Diensteinstellungen
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    action(s, "remove");
                    close();
                  }}
                >
                  Dienst entfernen
                </button>
              </div>
            )
          );
        })()}
      {panel === "known" && (
        <div
          className="modal known-services-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Dienst hinzufügen"
        >
          <div className="modal-heading">
            <h2>Dienst hinzufügen</h2>
            <button title="Schließen" onClick={close}>
              <X size={20} />
            </button>
          </div>
          <div className="known-services-list">
            <button onClick={() => setPanel("add")}>
              <Plus size={24} />
              <span>Benutzerdefinierter Dienst</span>
            </button>
            {state.catalog?.map((s) => {
              const exists = c.services.some((item) => item.id === s.id);
              return (
                <button
                  key={s.id}
                  disabled={exists}
                  onClick={() =>
                    void send({ type: "addKnown", id: s.id })
                      .then(() => setPanel("settings"))
                      .catch(() => {})
                  }
                >
                  <Icon service={s} />
                  <span>{s.name}</span>
                  {exists && <small>Vorhanden</small>}
                </button>
              );
            })}
          </div>
          {state.catalogError && (
            <p className="warning">{state.catalogError}</p>
          )}
          <div className="modal-footer">
            <button
              onClick={() => void send({ type: "catalog", action: "open" })}
            >
              Katalog bearbeiten
            </button>
            <button
              onClick={() => void send({ type: "catalog", action: "reload" })}
            >
              Neu laden
            </button>
          </div>
        </div>
      )}
      {(panel === "add" || edit) && (
        <ServiceDialog
          initial={edit}
          services={c.services}
          onClose={close}
          onSave={async (s) => {
            await send({ type: "saveService", service: s });
            close();
          }}
          onClear={(s) => action(s, "clearProfile")}
        />
      )}
      {panel === "settings" && (
        <SettingsDialog
          state={state}
          send={send}
          onClose={close}
          onAdd={() => setPanel("known")}
          onEdit={(s) => {
            setPanel(null);
            setEdit(s);
          }}
        />
      )}
      {(error || state.persistenceError) && (
        <div className="toast" role="alert">
          <span>{error || state.persistenceError}</span>
          <button
            title="Meldung schließen"
            onClick={() => {
              setError("");
              if (state.persistenceError)
                setState({ ...state, persistenceError: "" });
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function ServiceDialog({
  initial,
  services,
  onClose,
  onSave,
  onClear,
}: {
  initial: Service | null;
  services: Service[];
  onClose: () => void;
  onSave: (s: Service) => Promise<void>;
  onClear: (s: Service) => void;
}) {
  const [s, set] = useState<Service>(
    initial
      ? structuredClone(initial)
      : serviceSchema.parse({
          id: crypto.randomUUID(),
          name: "Neuer Dienst",
          url: "",
          profile: crypto.randomUUID(),
        }),
  );
  const [error, setError] = useState("");
  const field = <K extends keyof Service>(key: K, value: Service[K]) =>
    set({ ...s, [key]: value });
  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label="Diensteinstellungen"
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">DEINE VERBINDUNGEN</span>
          <h2>{initial ? "Dienst bearbeiten" : "Neuer Dienst"}</h2>
        </div>
        <button title="Schließen" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(s).catch((e) => setError(String(e)));
        }}
      >
        <div className="form-grid">
          <label>
            Name
            <input
              autoFocus
              required
              maxLength={60}
              value={s.name}
              onChange={(e) => field("name", e.target.value)}
            />
          </label>
          <label>
            Session-Profil
            <input
              required
              pattern={"[a-zA-Z0-9_\\-]{1,64}"}
              list="profiles"
              value={s.profile}
              disabled={!!initial?.running}
              onChange={(e) => field("profile", e.target.value)}
            />
            <datalist id="profiles">
              {[...new Set(services.map((s) => s.profile))].map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label className="full">
            Start-URL
            <input
              required={s.kind !== "widgets"}
              type="url"
              placeholder="https://…"
              value={s.url}
              disabled={!!initial?.running}
              onChange={(e) => field("url", e.target.value)}
            />
          </label>
        </div>
        {initial?.running && (
          <p className="note">
            Für URL- und Profilwechsel den Dienst zuerst stoppen.
          </p>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={s.allowHttp}
            onChange={(e) => field("allowHttp", e.target.checked)}
          />{" "}
          HTTP ausdrücklich erlauben (z. B. lokales Home Assistant)
        </label>
        {s.allowHttp && (
          <p className="warning">
            HTTP überträgt Daten unverschlüsselt. Nur für ein vertrauenswürdiges
            Netzwerk verwenden.
          </p>
        )}
        <div className="form-grid">
          <label>
            Zoom
            <select
              value={s.zoom}
              onChange={(e) => field("zoom", Number(e.target.value))}
            >
              {[
                0.5,
                0.75,
                0.9,
                1,
                1.1,
                1.25,
                1.5,
                1.75,
                2,
                ...(![0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2].includes(
                  s.zoom,
                )
                  ? [s.zoom]
                  : []),
              ]
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>
                    {Math.round(n * 100)} %
                  </option>
                ))}
            </select>
          </label>
          <label>
            Eigenes Icon (PNG, JPEG, WebP)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 140000) {
                  setError("Icon maximal 140 KB.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => field("icon", String(reader.result));
                reader.readAsDataURL(f);
              }}
            />
          </label>
        </div>
        <div className="check-row">
          <label className="check">
            <input
              type="checkbox"
              checked={s.running}
              onChange={(e) => field("running", e.target.checked)}
            />{" "}
            Gestartet
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => field("enabled", e.target.checked)}
            />{" "}
            In Leiste anzeigen
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={s.muted}
              onChange={(e) => field("muted", e.target.checked)}
            />{" "}
            Stumm
          </label>
        </div>
        <h3>
          <Shield size={15} /> Berechtigungen
        </h3>
        <p className="note">
          Nur für den Ursprung der Start-URL. Bildschirmfreigabe fragt immer
          nach einer Quelle. Gleiche Profilnamen teilen Anmeldedaten.
        </p>
        <div className="form-grid">
          {(
            Object.entries({
              microphone: "Mikrofon",
              camera: "Kamera",
              notifications: "Benachrichtigungen",
              screen: "Bildschirmfreigabe",
            }) as [keyof Service["permissions"], string][]
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <select
                value={s.permissions[key]}
                onChange={(e) =>
                  field("permissions", {
                    ...s.permissions,
                    [key]: e.target.value,
                  })
                }
              >
                <option value="ask">Nachfragen</option>
                <option value="allow">Erlauben</option>
                <option value="deny">Verweigern</option>
              </select>
            </label>
          ))}
        </div>
        <h3>Ausgeblendete Website-Elemente</h3>
        {s.hiddenElements.length === 0 && (
          <p className="note">
            Rechtsklick auf das Dienst-Icon → Element ausblenden.
          </p>
        )}
        {s.hiddenElements.map((rule, index) => (
          <div className="hidden-rule" key={index}>
            <input
              type="checkbox"
              aria-label="Regel aktiv"
              checked={rule.enabled}
              onChange={(e) =>
                field(
                  "hiddenElements",
                  s.hiddenElements.map((r, i) =>
                    i === index ? { ...r, enabled: e.target.checked } : r,
                  ),
                )
              }
            />
            <code title={rule.origin + " · " + rule.selector}>
              {rule.selector}
            </code>
            <button
              type="button"
              onClick={() =>
                field(
                  "hiddenElements",
                  s.hiddenElements.filter((_, i) => i !== index),
                )
              }
            >
              Löschen
            </button>
          </div>
        ))}
        {error && <p className="warning">{error}</p>}
        <div className="modal-footer">
          {initial && (
            <button
              type="button"
              className="danger text-button"
              onClick={() => onClear(initial)}
            >
              Profil abmelden / löschen
            </button>
          )}
          <button type="button" onClick={onClose}>
            Abbrechen
          </button>
          <button className="primary" type="submit">
            <Check size={15} /> Speichern
          </button>
        </div>
      </form>
    </div>
  );
}
function SettingsDialog({
  state,
  send,
  onClose,
  onEdit,
  onAdd,
}: {
  state: Snapshot;
  send: (c: Command) => Promise<void>;
  onClose: () => void;
  onEdit: (s: Service) => void;
  onAdd: () => void;
}) {
  const [tab, setTab] = useState("Allgemein"),
    [settings, setSettings] = useState({ ...state.config.settings });
  const [sortId, setSortId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const fields = {
    autostart: "Mit Windows starten (installierte App)",
    startMinimized: "Minimiert starten",
    minimizeToTray: "Beim Minimieren im Tray ausblenden",
    closeToTray: "Beim Schließen im Tray weiterlaufen",
    restoreWindow: "Fensterposition wiederherstellen",
    restoreSession: "Letzte Spaltenbelegung wiederherstellen",
    saveWidths: "Spaltenbreiten beim Start wiederherstellen",
    notifications: "Desktop-Benachrichtigungen zulassen",
    showColumnTabs: "Spalten-Tableiste anzeigen",
    groupActive: "Aktive Dienste gruppieren",
    hideInactive: "Inaktive Apps ausblenden",
  };
  return (
    <div
      className="modal settings-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Einstellungen"
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">INDIGODOCK</span>
          <h2>Einstellungen</h2>
        </div>
        <button title="Schließen" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="settings-tabs">
        {["Allgemein", "Layout", "Dienste", "Erweitert"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="settings-content">
        {tab === "Allgemein" && (
          <>
            <p className="note">
              Deutsch · Dunkles Design · Native Windows-Mediensteuerung
            </p>
            {Object.entries(fields)
              .filter(
                ([k]) =>
                  ![
                    "restoreSession",
                    "saveWidths",
                    "showColumnTabs",
                    "groupActive",
                    "hideInactive",
                  ].includes(k),
              )
              .map(([key, label]) => (
                <label key={key} className="setting-row">
                  {label}
                  <input
                    type="checkbox"
                    checked={settings[key as keyof typeof fields]}
                    onChange={(e) =>
                      setSettings({ ...settings, [key]: e.target.checked })
                    }
                  />
                </label>
              ))}
          </>
        )}
        {tab === "Layout" && (
          <>
            {(
              [
                "showColumnTabs",
                "groupActive",
                "hideInactive",
                "restoreSession",
                "saveWidths",
              ] as const
            ).map((key) => (
              <label key={key} className="setting-row">
                {fields[key]}
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) =>
                    setSettings({ ...settings, [key]: e.target.checked })
                  }
                />
              </label>
            ))}
            <label className="setting-row">
              Dock-Position
              <select
                value={settings.dockPosition}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dockPosition: e.target
                      .value as typeof settings.dockPosition,
                  })
                }
              >
                {Object.entries({
                  bottom: "Unten",
                  left: "Links",
                  right: "Rechts",
                  top: "Oben",
                }).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="setting-row">
              Standardanzahl Spalten
              <select
                value={settings.defaultColumns}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultColumns: Number(e.target.value),
                  })
                }
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <p className="note">
              Standardanzahl gilt, wenn „Letzte Spaltenbelegung“ deaktiviert
              ist. Bekannte Layouts bleiben ansonsten getrennt gespeichert.
            </p>
            <button onClick={() => void send({ type: "resetLayout" })}>
              Layoutzuordnungen zurücksetzen
            </button>
          </>
        )}
        {tab === "Dienste" && (
          <div className="service-list">
            <button className="primary add-service-settings" onClick={onAdd}>
              <Plus size={16} /> Dienst hinzufügen
            </button>
            {state.config.services.map((s, i) => (
              <div
                key={s.id}
                className={
                  (sortId === s.id ? "sorting " : "") +
                  (dropAt === i ? "drop-before " : "") +
                  (dropAt === i + 1 && i === state.config.services.length - 1
                    ? "drop-after"
                    : "")
                }
                draggable
                onDragStart={(e) => {
                  setSortId(s.id);
                  e.dataTransfer.setData("text/plain", s.id);
                }}
                onDragEnd={() => {
                  setSortId(null);
                  setDropAt(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  const b = e.currentTarget.getBoundingClientRect();
                  setDropAt(i + (e.clientY > b.y + b.height / 2 ? 1 : 0));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (sortId)
                    void send({
                      type: "reorder",
                      ids: insertAt(
                        state.config.services.map((s) => s.id),
                        sortId,
                        dropAt ?? i,
                      ),
                    });
                  setSortId(null);
                  setDropAt(null);
                }}
              >
                <GripVertical size={15} />
                <Icon service={s} />
                <span>
                  {s.name}
                  <small>
                    {s.profile} · {s.running ? "Gestartet" : "Gestoppt"}
                  </small>
                </span>
                <button
                  title="Dienst löschen"
                  onClick={() =>
                    void send({ type: "service", id: s.id, action: "remove" })
                  }
                >
                  <X size={16} />
                </button>
                <button onClick={() => onEdit(s)}>Bearbeiten</button>
              </div>
            ))}
          </div>
        )}
        {tab === "Erweitert" && (
          <>
            <p>IndigoDock {state.version}</p>
            <div className="update-panel">
              <p role="status">
                {state.update?.message || "Updates über GitHub Releases"}
              </p>
              <button
                disabled={
                  state.update?.state === "checking" ||
                  state.update?.state === "downloading"
                }
                onClick={() => void send({ type: "update", action: "check" })}
              >
                Auf Updates prüfen
              </button>
              {state.update?.state === "available" && (
                <button
                  onClick={() =>
                    void send({ type: "update", action: "download" })
                  }
                >
                  Update herunterladen
                </button>
              )}
              {state.update?.state === "downloaded" && (
                <button
                  onClick={() =>
                    void send({ type: "update", action: "install" })
                  }
                >
                  Neu starten und aktualisieren
                </button>
              )}
            </div>
            <p className="note">
              Chromium verwaltet die Anmeldedaten lokal. Google-Anmeldung kann
              eingebettete Browser blockieren; Spotify-Wiedergabe ist ohne
              unterstütztes Widevine nicht garantiert. „Im Browser öffnen“
              verwendet eine separate Browsersitzung.
            </p>
            <div className="advanced-actions">
              <button
                onClick={() =>
                  void send({ type: "diagnostics", action: "data" })
                }
              >
                Datenverzeichnis öffnen
              </button>
              <button
                onClick={() =>
                  void send({ type: "diagnostics", action: "logs" })
                }
              >
                Diagnoselog anzeigen
              </button>
              <button
                className="danger"
                onClick={() => void send({ type: "window", action: "quit" })}
              >
                IndigoDock vollständig beenden
              </button>
            </div>
          </>
        )}
      </div>
      <div className="modal-footer">
        <button onClick={onClose}>Schließen</button>
        <button
          className="primary"
          onClick={() =>
            void send({ type: "settings", settings })
              .then(onClose)
              .catch(() => {})
          }
        >
          Einstellungen speichern
        </button>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
