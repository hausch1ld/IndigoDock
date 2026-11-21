import { t, locale, setLanguage } from "../shared/i18n";
import { GroupIcon, GroupIconPicker } from "./group-icons";
import { LocationChooser } from "./weather";
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
const Clock = memo(function Clock({ language }: { language: string }) {
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
        {now.toLocaleTimeString(locale(), {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </strong>
      <span>
        {now.toLocaleDateString(locale(), { day: "numeric", month: "short" })}
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [iconGroup, setIconGroup] = useState<string | null>(null);
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
    setSettingsOpen(false);
    setIconGroup(null);
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
    settingsOpen ||
    panel ||
    iconGroup ||
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
      if (e.key === "Escape") {
        if (settingsOpen && (panel === "known" || panel === "add" || edit)) { setEdit(null); setPanel("settings"); }
        else close();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [panel, settingsOpen, edit]);
  setLanguage(state?.config.settings.language ?? "en");
  document.documentElement.lang = state?.config.settings.language ?? "en";
  if (!state)
    return <main className="boot">IndigoDock {error || "starting …"}</main>;
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
    c.services.filter(
      (s) => c.settings.groupMode === "icon-only" || !groupedIds.has(s.id),
    ),
    c.settings,
  );
  const service = (id: string | null) => c.services.find((s) => s.id === id);
  const action = (
    s: Service,
    action: Extract<Command, { type: "service" }>["action"],
  ) => void send({ type: "service", id: s.id, action }).catch(() => {});
  const open = (s: Service, additive = false) => {
    close();
    if (!s.url && s.kind !== "widgets") {
      setEdit(s);
      return;
    }
    const current = l.columns.flatMap((col) =>
      col.active ? [col.active] : [],
    );
    const ids = additive
      ? current.includes(s.id)
        ? current.filter((id) => id !== s.id)
        : [...current, s.id]
      : [s.id];
    if (ids.length > 4) {
      setError(t("Select up to four apps at once."));
      return;
    }
    if (ids.length) void send({ type: "selectApps", ids }).catch(() => {});
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
        title={`${s.name} · ${s.running ? t("Running") : t("Stopped")}${s.muted ? " · Stumm" : ""}`}
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
        onClick={(e) => open(s, e.ctrlKey)}
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
      style={
        {
          "--ui-font-size": `${c.settings.fontSize}px`,
          "--accent": c.settings.accentColor,
          "--dock-color": c.settings.dockColor,
          "--text": c.sidebar.textColor,
        } as React.CSSProperties
      }
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
        <div className="titlebar-clock">{!c.sidebar.open && <Clock language={c.settings.language} />}</div>
        <div className="window-actions">
          <button
            title={t("Settings")}
            onClick={() => {
              close();
              setSettingsOpen(true);
              setPanel("settings");
            }}
          >
            <Settings size={15} />
          </button>
          <button
            title={t("Minimize")}
            onClick={() => void send({ type: "window", action: "minimize" })}
          >
            <Minus size={16} />
          </button>
          <button
            title={t("Maximize / Restore")}
            onClick={() => void send({ type: "window", action: "maximize" })}
          >
            <Square size={12} />
          </button>
          <button
            className="close-window"
            title={t("Close")}
            onClick={() => void send({ type: "window", action: "close" })}
          >
            <X size={17} />
          </button>
        </div>
      </header>
      {c.sidebar.open && (
        <aside
          className="widget-sidebar"
          aria-label={t("Widget sidebar")}
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
                            {tab.muted && <span>{t("· muted")}</span>}
                          </button>
                        )
                      );
                    })}
                  </div>
                  {s && (
                    <button
                      title={t("Reload")}
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
                        <p>{t(status?.error || "This service is stopped.")}</p>
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
                          {s.running ? t("Try again") : t("Start service")}
                        </button>
                        <button
                          className="text-button"
                          onClick={() => action(s, "external")}
                        >
                          {t("Open in browser")}<ExternalLink size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="empty-symbol">
                          <Columns3 size={30} />
                        </div>
                        <h1>{t(`Column ${i + 1}`)}</h1>
                        <p>{t("Drag a service here or select one below.")}</p>
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
            aria-label={t(`Column divider ${i + 1}`)}
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
                <strong>{t("Column ")}{i + 1}</strong>
                <small>{service(choose || drag)?.name} {t("show here")}</small>
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
            title={t("Create group")}
            onClick={() => setPanel(panel === "layout" ? null : "layout")}
          >
            <Columns3 size={21} />
            <ChevronDown size={12} />
          </button>
        </div>
        <nav className="services" aria-label={t("Services")}>
          {c.groups.map((g) => (
            <div
              key={g.id}
              className={
                "dock-group mode-" +
                c.settings.groupMode +
                " " +
                (c.activeGroup === g.id ? "selected" : "")
              }
              role="group"
              aria-label={t("Group: ") + g.name}
              onContextMenu={(e) => {
                e.preventDefault();
                close();
                setGroupContext({ id: g.id, x: e.clientX });
              }}
            >
              {c.settings.groupMode !== "group-only" && (
                <button
                  className="group-activate"
                  onDragOver={(e) => {
                    if (
                      c.settings.groupMode === "icon-only" &&
                      g.layout.columns.some((col) => !col.active)
                    )
                      e.preventDefault();
                  }}
                  onDrop={(e) => {
                    const column = g.layout.columns.findIndex(
                      (col) => !col.active,
                    );
                    const id = e.dataTransfer.getData("text/plain");
                    if (column >= 0 && id) {
                      e.preventDefault();
                      void send({
                        type: "groupSlot",
                        group: g.id,
                        column,
                        id,
                      }).catch(() => {});
                      close();
                    }
                  }}
                  title={t("Show group: ") + g.name}
                  aria-label={t("Show group: ") + g.name}
                  onClick={() => {
                    close();
                    void send({ type: "activateGroup", id: g.id }).catch(
                      () => {},
                    );
                  }}
                >
                  <GroupIcon id={g.icon} size={21} />
                </button>
              )}
              {c.settings.groupMode !== "icon-only" &&
                g.layout.columns.map((col, i) => {
                  const s = service(col.active);
                  return (
                    <button
                      key={i}
                      className={"group-slot " + (!s ? "empty-slot" : "")}
                      title={
                        s
                          ? c.settings.groupMode === "group-only"
                            ? t(`${s.name} · Click: group · Double-click: single view`)
                            : t(`${s.name} · Click: single view · CTRL: multiple selection`)
                          : t(`Drag an app into column ${i + 1}`)
                      }
                      aria-label={s ? s.name : t(`Empty group slot ${i + 1}`)}
                      draggable={!!s}
                      onDragStart={(e) => {
                        if (s) dragStart(e, s);
                      }}
                      onDragEnd={close}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("slot-hover");
                      }}
                      onDragLeave={(e) =>
                        e.currentTarget.classList.remove("slot-hover")
                      }
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.remove("slot-hover");
                        const id = e.dataTransfer.getData("text/plain");
                        if (id)
                          void send({
                            type: "groupSlot",
                            group: g.id,
                            column: i,
                            id,
                          }).catch(() => {});
                        close();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          s &&
                          (c.settings.groupMode !== "group-only" || e.ctrlKey)
                        )
                          open(s, e.ctrlKey);
                        else {
                          close();
                          void send({ type: "activateGroup", id: g.id }).catch(
                            () => {},
                          );
                        }
                      }}
                      onDoubleClick={(e) => {
                        if (s && c.settings.groupMode === "group-only") {
                          e.stopPropagation();
                          open(s);
                        }
                      }}
                      onContextMenu={(e) => {
                        if (s) {
                          e.preventDefault();
                          e.stopPropagation();
                          close();
                          setContext({ id: s.id, x: e.clientX });
                        }
                      }}
                    >
                      {s ? (
                        <Icon service={s} />
                      ) : (
                        <span className="slot-glow" />
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
          {groups.primary.map(renderService)}
          {groups.separator && (
            <span className="dock-separator" role="separator" />
          )}
          {groups.secondary.map(renderService)}
          {c.settings.hideInactive && groups.inactive.length > 0 && (
            <button
              className="inactive-trigger"
              title={t("Inactive apps")}
              aria-label={t("Inactive apps")}
              onClick={() => setPanel(panel === "inactive" ? null : "inactive")}
            >
              <Menu size={21} />
            </button>
          )}
        </nav>
        <div className="dock-right">
          <button
            className="sidebar-trigger"
            title={c.sidebar.open ? t("Collapse sidebar") : t("Expand sidebar")}
            aria-pressed={c.sidebar.open}
            onClick={() => {
              close();
              void send({ type: "sidebar", patch: { open: !c.sidebar.open } });
            }}
          >
            {c.sidebar.open ? (
              <PanelRightClose size={20} />
            ) : (
              <PanelRightOpen size={20} />
            )}
          </button>
        </div>
      </footer>
      {(panel || context || edit || groupContext || iconGroup) && (
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
            {t("Show group")}</button>
          {c.settings.groupMode !== "group-only" && (
            <button
              onClick={() => {
                const id = groupContext.id;
                close();
                setIconGroup(id);
              }}
            >
              {t("Choose group icon")}</button>
          )}
          <button
            onClick={() => {
              void send({ type: "deleteGroup", id: groupContext.id });
              close();
            }}
          >
            {t("Delete group")}</button>
        </div>
      )}
      {panel === "layout" && (
        <div className="layout-menu popover">
          <span className="eyebrow">{t("Create new group")}</span>
          <div className="layout-options">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                className=""
                onClick={() => {
                  void send({ type: "createGroup", count: n }).catch(() => {});
                  close();
                }}
              >
                <span className="layout-preview">
                  {Array.from({ length: n }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
                <span>
                  {n} {n === 1 ? t("Column") : t("Columns")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {panel === "inactive" && (
        <div className="inactive-menu popover">
          <h3>{t("Inactive apps")}</h3>
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
              onClick={(e) => open(s, e.ctrlKey)}
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
                {c.count > 1 &&
                  !groupedIds.has(s.id) &&
                  l.columns.every((col) => col.active) &&
                  l.columns.some((col) => col.active === s.id) && (
                    <button
                      onClick={() => {
                        void send({ type: "saveGroup" }).catch(() => {});
                        close();
                      }}
                    >
                      {t("Save as group")}</button>
                  )}
                {c.settings.groupMode !== "group-only" &&
                  groupedIds.has(s.id) && (
                    <button
                      onClick={() => {
                        const g = c.groups.find((g) =>
                          groupIds(g.layout).includes(s.id),
                        )!;
                        close();
                        setIconGroup(g.id);
                      }}
                    >
                      {t("Choose group icon")}</button>
                  )}
                {c.groups.some((g) => groupIds(g.layout).includes(s.id)) && (
                  <button
                    onClick={() => {
                      const g = c.groups.find((g) =>
                        groupIds(g.layout).includes(s.id),
                      )!;
                      void send({ type: "deleteGroup", id: g.id });
                      close();
                    }}
                  >
                    {t("Delete group")}</button>
                )}
                <div className="context-heading">
                  <Icon service={s} />
                  <div>
                    <strong>{s.name}</strong>
                    <small>
                      {s.running ? t("Keeps running in the background") : t("Stopped")}
                    </small>
                  </div>
                </div>
                {(
                  [
                    { label: "Start", key: "start", disabled: s.running },
                    { label: "Stop", key: "stop", disabled: !s.running },
                    {
                      label: "Hide element",
                      key: "hideElement",
                      disabled: !s.running || s.kind === "widgets",
                    },
                    { label: "Reload", key: "reload", disabled: !s.running },
                    {
                      label: s.muted ? t("Unmute") : t("Mute"),
                      key: "mute",
                    },
                    { label: "Restore start URL", key: "reset" },
                    { label: "Open in browser", key: "external" },
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
                    {t(a.label)}
                  </button>
                ))}
                <hr />
                <button
                  onClick={() => {
                    setContext(null);
                    setEdit(s);
                  }}
                >
                  {t("Service settings")}</button>
                <button
                  className="danger"
                  onClick={() => {
                    action(s, "remove");
                    close();
                  }}
                >
                  {t("Remove service")}</button>
              </div>
            )
          );
        })()}
      {panel === "known" && (
        <div
          className="modal known-services-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t("Add service")}
        >
          <div className="modal-heading">
            <h2>{t("Add service")}</h2>
            <button title={t("Close")} onClick={() => setPanel("settings")}>
              <X size={20} />
            </button>
          </div>
          <div className="known-services-list">
            <button onClick={() => setPanel("add")}>
              <Plus size={24} />
              <span>{t("Custom service")}</span>
            </button>
            {state.catalog?.map((s) => {
              const exists = c.services.some((item) => item.id === s.id);
              return (
                <button
                  key={s.id}
                  onClick={() =>
                    void send({ type: "addKnown", id: s.id })
                      .then(() => setPanel("settings"))
                      .catch(() => {})
                  }
                >
                  <Icon service={s} />
                  <span>{s.name}</span>
                  {exists && <small>{t("Add another instance")}</small>}
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
              {t("Edit catalog")}</button>
            <button
              onClick={() => void send({ type: "catalog", action: "reload" })}
            >
              {t("Reload")}</button>
          </div>
        </div>
      )}
      {iconGroup && (
        <div
          className="modal group-icon-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t("Choose group icon")}
        >
          <div className="modal-heading">
            <h2>{t("Choose group icon")}</h2>
            <button title={t("Close")} onClick={close}>
              <X size={20} />
            </button>
          </div>
          <GroupIconPicker
            selected={
              c.groups.find((g) => g.id === iconGroup)?.icon ?? "columns"
            }
            onSelect={(icon) => {
              void send({ type: "groupIcon", id: iconGroup, icon })
                .then(close)
                .catch(() => {});
            }}
          />
          <small>{t("Lucide · ISC license")}</small>
        </div>
      )}
      {(panel === "add" || edit) && (
        <ServiceDialog
          initial={edit}
          services={c.services}
          onClose={() => { setEdit(null); setPanel(settingsOpen ? "settings" : null); }}
          onSave={async (s) => {
            await send({ type: "saveService", service: s });
            setEdit(null); setPanel(settingsOpen ? "settings" : null);
          }}
          onClear={(s) => action(s, "clearProfile")}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          state={state}
          inactive={panel === "known" || panel === "add" || !!edit}
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
          <span>{t(error || state.persistenceError || "")}</span>
          <button
            title={t("Dismiss notification")}
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
          name: "New service",
          url: "",
          profile: crypto.randomUUID(),
        }),
  );
  const [error, setError] = useState("");
  const field = <K extends keyof Service>(key: K, value: Service[K]) =>
    set({ ...s, [key]: value });
  return (
    <div
      className="modal service-editor-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t("Service settings")}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">{t("YOUR CONNECTIONS")}</span>
          <h2>{initial ? t("Edit service") : t("New service")}</h2>
        </div>
        <button title={t("Close")} onClick={onClose}>
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
          <label className="check">
            <input
              type="checkbox"
              role="switch"
              checked={s.globalAccess}
              onChange={(e) => field("globalAccess", e.target.checked)}
            />
            {t("Allow shared profile")}</label>
          <p className="note full">
            {t("Enabled services share cookies and sign-ins like browser tabs. Other instances stay isolated. Switching restarts this service and preserves its previous profile.")}</p>
          <label className="full">
            {t("Start URL")}<input
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
            {t("Stop the service before changing its URL.")}</p>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={s.allowHttp}
            onChange={(e) => field("allowHttp", e.target.checked)}
          />{" "}
          {t("Allow HTTP explicitly (e.g. local Home Assistant)")}</label>
        {s.allowHttp && (
          <p className="warning">
            {t("HTTP transfers data without encryption. Use only on a trusted network.")}</p>
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
            {t("Custom icon (PNG, JPEG, WebP)")}<input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 140000) {
                  setError(t("Maximum icon size: 140 KB."));
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
            {t("Running")}</label>
          <label className="check">
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => field("enabled", e.target.checked)}
            />{" "}
            {t("Show in dock")}</label>
          <label className="check">
            <input
              type="checkbox"
              checked={s.muted}
              onChange={(e) => field("muted", e.target.checked)}
            />{" "}
            {t("Muted")}</label>
        </div>
        <h3>
          <Shield size={15} /> {t("Permissions")}</h3>
        <p className="note">
          {t("Applies only to the start URL origin. Screen sharing always asks for a source. Shared-profile services share sign-ins; website origin boundaries remain enforced.")}</p>
        <div className="form-grid">
          {(
            Object.entries({
              microphone: "Microphone",
              camera: "Camera",
              notifications: "Notifications",
              screen: "Screen sharing",
            }) as [keyof Service["permissions"], string][]
          ).map(([key, label]) => (
            <label key={key}>
              {t(label)}
              <select
                value={s.permissions[key]}
                onChange={(e) =>
                  field("permissions", {
                    ...s.permissions,
                    [key]: e.target.value,
                  })
                }
              >
                <option value="ask">{t("Ask")}</option>
                <option value="allow">{t("Allow")}</option>
                <option value="deny">{t("Deny")}</option>
              </select>
            </label>
          ))}
        </div>
        <h3>{t("Hidden website elements")}</h3>
        {s.hiddenElements.length === 0 && (
          <p className="note">
            {t("Right-click the service icon → Hide element.")}</p>
        )}
        {s.hiddenElements.map((rule, index) => (
          <div className="hidden-rule" key={index}>
            <input
              type="checkbox"
              aria-label={t("Rule enabled")}
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
              {t("Delete")}</button>
          </div>
        ))}
        {error && <p className="warning">{t(error)}</p>}
        <div className="modal-footer">
          {initial && (
            <button
              type="button"
              className="danger text-button"
              onClick={() => onClear(initial)}
            >
              {t("Sign out / clear profile")}</button>
          )}
          <button type="button" onClick={onClose}>
            {t("Cancel")}</button>
          <button className="primary" type="submit">
            <Check size={15} /> {t("Save")}</button>
        </div>
      </form>
    </div>
  );
}
function SettingsDialog({
  inactive,
  state,
  send,
  onClose,
  onEdit,
  onAdd,
}: {
  inactive: boolean;
  state: Snapshot;
  send: (c: Command) => Promise<void>;
  onClose: () => void;
  onEdit: (s: Service) => void;
  onAdd: () => void;
}) {
  const [tab, setTab] = useState("General"),
    [settings, setSettings] = useState({ ...state.config.settings });
  const [sidebar, setSidebar] = useState({
    weatherLocation: state.config.sidebar.weatherLocation,
    background: state.config.sidebar.background,
    widgetBackground: state.config.sidebar.widgetBackground,
    textColor: state.config.sidebar.textColor,
    widgets: [...state.config.sidebar.widgets],
  });
  const [weatherEdit, setWeatherEdit] = useState(false);
  const [sortId, setSortId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const fields = {
    autostart: "Launch with Windows (installed app)",
    startMinimized: "Start minimized",
    minimizeToTray: "Hide in tray when minimized",
    closeToTray: "Keep running in tray when closed",
    restoreWindow: "Restore window position",
    restoreSession: "Restore last workspace",
    saveWidths: "Restore column widths on startup",
    notifications: "Allow desktop notifications",
    showColumnTabs: "Show column tab bars",
    groupActive: "Group running services",
    hideInactive: "Hide inactive apps",
  };
  return (
    <div
      className="modal settings-modal"
      inert={inactive}
      role="dialog"
      aria-modal="true"
      aria-label={t("Settings")}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">INDIGODOCK</span>
          <h2>{t("Settings")}</h2>
        </div>
        <button title={t("Close")} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="settings-tabs">
        {["General", "Appearance", "Services", "Sidebar", "Advanced"].map(
          (tabLabel) => (
            <button
              key={t(tabLabel)}
              className={tab === tabLabel ? "selected" : ""}
              onClick={() => setTab(tabLabel)}
            >
              {t(tabLabel)}
            </button>
          ),
        )}
      </div>
      <div className="settings-content">
        {tab === "General" && (
          <>
            <label className="setting-row">{t("Language")}<select aria-label={t("Language")} value={settings.language} onChange={e=>setSettings({...settings,language:e.target.value as "en"|"de"})}><option value="en">English</option><option value="de">Deutsch</option></select></label>
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
                  {t(label)}
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
        {tab === "Appearance" && (
          <>
            <label className="setting-row">
              {t("Group mode")}<select
                aria-label={t("Group mode")}
                value={settings.groupMode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    groupMode: e.target.value as typeof settings.groupMode,
                  })
                }
              >
                <option value="icon-group">{t("Icon + group")}</option>
                <option value="group-only">{t("Group only")}</option>
                <option value="icon-only">{t("Icon only")}</option>
              </select>
            </label>
            <label className="setting-row">{t("Font size")}<select aria-label={t("Font size")} value={settings.fontSize} onChange={e=>setSettings({...settings,fontSize:Number(e.target.value)})}>{[14,16,18,20].map(n=><option key={n} value={n}>{n} px</option>)}</select></label>
            <h3>{t("Appearance")}</h3>
            {(
              [
                ["background", "Sidebar background"],
                ["widgetBackground", "Widget background"],
                ["textColor", "Text color"],
              ] as const
            ).map(([key, label]) => (
              <label className="setting-row" key={key}>
                {t(label)}
                <input
                  type="color"
                  aria-label={t(label)}
                  value={sidebar[key]}
                  onChange={(e) =>
                    setSidebar({ ...sidebar, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            {(
              [
                ["accentColor", "Accent color"],
                ["dockColor", "Dock background"],
              ] as const
            ).map(([key, label]) => (
              <label className="setting-row" key={key}>
                {t(label)}
                <input
                  type="color"
                  aria-label={t(label)}
                  value={settings[key]}
                  onChange={(e) =>
                    setSettings({ ...settings, [key]: e.target.value })
                  }
                />
              </label>
            ))}

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
                {t(fields[key])}
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
              {t("Dock position")}<select
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
                  bottom: "Bottom",
                  left: "Left",
                  right: "Right",
                  top: "Top",
                }).map(([value, label]) => (
                  <option key={value} value={value}>
                    {t(label)}
                  </option>
                ))}
              </select>
            </label>
            <label className="setting-row">
              {t("Default column count")}<select
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
              {t("The default applies when restoring the last workspace is disabled. Other saved layouts are kept separately.")}</p>
            <button onClick={() => void send({ type: "resetLayout" })}>
              {t("Reset layout assignments")}</button>
          </>
        )}
        {tab === "Services" && (
          <div className="service-list">
            <button className="primary add-service-settings" onClick={onAdd}>
              <Plus size={16} /> {t("Add service")}</button>
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
                    {s.profile} · {s.running ? t("Running") : t("Stopped")}
                  </small>
                </span>
                <button
                  title={t("Delete service")}
                  onClick={() =>
                    void send({ type: "service", id: s.id, action: "remove" })
                  }
                >
                  <X size={16} />
                </button>
                <button onClick={() => onEdit(s)}>{t("Edit")}</button>
              </div>
            ))}
          </div>
        )}
        {tab === "Sidebar" && (
          <div className="sidebar-settings">
            <h3>Widgets</h3>
            {weatherEdit && (
              <LocationChooser
                api={api}
                onClose={() => setWeatherEdit(false)}
                onSelect={(location) => {
                  setSidebar({ ...sidebar, weatherLocation: location });
                  setWeatherEdit(false);
                }}
              />
            )}
            {(
              [
                ["clock", "Clock and date"],
                ["spotify", "Spotify"],
                ["performance", "System usage"],
                ["mixer", "Windows volume mixer"],
                ["notes", "Notes"],
                ["calendar", "Calendar"],
                ["weather", "Weather"],
              ] as const
            ).map(([id, label]) => (
              <label className="setting-row" key={id}>
                <span>
                  {t(label)}{" "}
                  {id === "weather" && sidebar.weatherLocation && <small className="weather-setting-location">{sidebar.weatherLocation.name}</small>}
                  {id === "weather" && (
                    <button
                      type="button"
                      title={t("Set weather location")}
                      onClick={(e) => {
                        e.preventDefault();
                        setWeatherEdit(!weatherEdit);
                      }}
                    >
                      <Settings size={16} />
                    </button>
                  )}
                </span>
                <input
                  type="checkbox"
                  aria-label={t(label)}
                  checked={sidebar.widgets.includes(id)}
                  onChange={(e) =>
                    setSidebar({
                      ...sidebar,
                      widgets: e.target.checked
                        ? [...sidebar.widgets, id]
                        : sidebar.widgets.filter((w) => w !== id),
                    })
                  }
                />
              </label>
            ))}
          </div>
        )}
        {tab === "Advanced" && (
          <>
            <p>IndigoDock {state.version}</p>
            <div className="credits">
              <button
                onClick={() => void send({ type: "infoLink", page: "icons" })}
              >
                {t("Group icons: Lucide · ISC license")}</button>
              <button
                onClick={() => void send({ type: "infoLink", page: "weather" })}
              >
                {t("Weather data: Open-Meteo")}</button>
              <button
                onClick={() =>
                  void send({ type: "infoLink", page: "weatherLicense" })
                }
              >
                {t("Weather license: CC BY 4.0 · temperatures rounded")}</button>
            </div>
            <div className="update-panel">
              <p role="status">
                {t(state.update?.message || "Updates from GitHub Releases")}
              </p>
              <button
                disabled={
                  state.update?.state === "checking" ||
                  state.update?.state === "downloading"
                }
                onClick={() => void send({ type: "update", action: "check" })}
              >
                {t("Check for updates")}</button>
              {state.update?.state === "available" && (
                <button
                  onClick={() =>
                    void send({ type: "update", action: "download" })
                  }
                >
                  {t("Download update")}</button>
              )}
              {state.update?.state === "downloaded" && (
                <button
                  onClick={() =>
                    void send({ type: "update", action: "install" })
                  }
                >
                  {t("Restart and update")}</button>
              )}
            </div>
            <p className="note">
              {t("Chromium stores sign-in data locally. Google may block embedded browser sign-in; Spotify playback requires supported Widevine. Opening in a browser uses a separate browser session.")}</p>
            <div className="advanced-actions">
              <button
                onClick={() =>
                  void send({ type: "diagnostics", action: "data" })
                }
              >
                {t("Open data directory")}</button>
              <button
                onClick={() =>
                  void send({ type: "diagnostics", action: "logs" })
                }
              >
                {t("Show diagnostic log")}</button>
              <button
                className="danger"
                onClick={() => void send({ type: "window", action: "quit" })}
              >
                {t("Quit IndigoDock")}</button>
            </div>
          </>
        )}
      </div>
      <div className="modal-footer settings-footer">
        <button className="outline" onClick={onClose}>{t("Close")}</button>
        <button
          className="primary"
          onClick={() =>
            void send({ type: "settings", settings })
              .then(() => send({ type: "sidebar", patch: sidebar }))
              .catch(() => {})
          }
        >
          {t("Apply")}</button>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
