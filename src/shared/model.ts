import { z } from "zod";
export const permissionSchema = z.enum(["ask", "allow", "deny"]);
export const widgetSchema = z.enum([
  "clock",
  "spotify",
  "performance",
  "mixer",
  "notes",
  "calendar",
]);
export const serviceSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  name: z.string().trim().min(1).max(60),
  kind: z.enum(["web", "widgets"]).default("web"),
  widgets: z
    .array(widgetSchema)
    .max(6)
    .default(["clock", "spotify", "performance", "mixer"]),
  url: z.string().max(2048),
  hiddenElements: z
    .array(
      z.object({
        selector: z
          .string()
          .min(1)
          .max(2048)
          .regex(/^[^{};@]+$/),
        origin: z.string().max(2048),
        enabled: z.boolean(),
      }),
    )
    .max(100)
    .default([]),
  currentUrl: z.string().max(4096).default(""),
  icon: z.string().max(200000).default(""),
  profile: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  running: z.boolean().default(false),
  enabled: z.boolean().default(true),
  muted: z.boolean().default(false),
  zoom: z.number().min(0.5).max(2).default(1),
  allowHttp: z.boolean().default(false),
  permissions: z
    .object({
      microphone: permissionSchema,
      camera: permissionSchema,
      notifications: permissionSchema,
      screen: permissionSchema,
    })
    .default({
      microphone: "ask",
      camera: "ask",
      notifications: "ask",
      screen: "ask",
    }),
});
export type Service = z.infer<typeof serviceSchema>;
export type Permission = keyof Service["permissions"];
export const columnSchema = z.object({
  services: z.array(z.string()).max(100),
  active: z.string().nullable(),
});
export const layoutSchema = z.object({
  ratios: z.array(z.number().positive()).min(1).max(4),
  columns: z.array(columnSchema).min(1).max(4),
});
export type Layout = z.infer<typeof layoutSchema>;
export const settingsSchema = z.object({
  dockPosition: z.enum(["bottom", "left", "right", "top"]).default("bottom"),
  autostart: z.boolean(),
  startMinimized: z.boolean(),
  minimizeToTray: z.boolean(),
  closeToTray: z.boolean(),
  restoreWindow: z.boolean(),
  restoreSession: z.boolean(),
  saveWidths: z.boolean(),
  defaultColumns: z.number().int().min(1).max(4),
  notifications: z.boolean(),
  showColumnTabs: z.boolean().default(true),
  groupActive: z.boolean().default(false),
  hideInactive: z.boolean().default(false),
});
export const sidebarSchema = z.object({
  calendarVersion: z.literal(1).default(1),
  open: z.boolean().default(false),
  background: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#141a20"),
  widgetBackground: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#1d2730"),
  textColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#e4ebf0"),
  notes: z.string().max(20000).default(""),
  widgets: z
    .array(widgetSchema)
    .max(6)
    .default(["clock", "spotify", "performance", "mixer", "notes", "calendar"]),
});
export const configSchema = z.object({
  version: z.literal(1),
  sidebar: sidebarSchema.default(() => sidebarSchema.parse({})),
  services: z.array(serviceSchema).max(100),
  count: z.number().int().min(1).max(4),
  layouts: z.record(z.string(), layoutSchema),
  groups: z
    .array(
      z.object({
        id: z.string().max(64),
        name: z.string().max(120),
        layout: layoutSchema,
      }),
    )
    .max(100)
    .default([]),
  activeGroup: z.string().nullable().default(null),
  settings: settingsSchema,
  window: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().min(640).max(16000),
    height: z.number().min(400).max(16000),
    maximized: z.boolean(),
  }),
});
export type Config = z.infer<typeof configSchema>;
export type Status = {
  state: "stopped" | "loading" | "ready" | "error";
  error?: string;
  audible?: boolean;
};
export type Snapshot = {
  config: Config;
  catalog?: Service[];
  catalogError?: string;
  status: Record<string, Status>;
  version: string;
  captures?: Record<string, string>;
  persistenceError?: string;
  update?: {
    state:
      | "idle"
      | "checking"
      | "available"
      | "current"
      | "downloading"
      | "downloaded"
      | "error";
    message: string;
    version?: string;
    percent?: number;
  };
};
const id = z.string().max(64);
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("addKnown"), id }),
  z.object({ type: z.literal("catalog"), action: z.enum(["open", "reload"]) }),
  z.object({
    type: z.literal("sidebar"),
    patch: z.object({
      open: sidebarSchema.shape.open.unwrap().optional(),
      background: sidebarSchema.shape.background.unwrap().optional(),
      widgetBackground: sidebarSchema.shape.widgetBackground
        .unwrap()
        .optional(),
      textColor: sidebarSchema.shape.textColor.unwrap().optional(),
      notes: sidebarSchema.shape.notes.unwrap().optional(),
      widgets: sidebarSchema.shape.widgets.unwrap().optional(),
    }),
  }),
  z.object({
    type: z.literal("spotifyControl"),
    action: z.enum([
      "toggle",
      "next",
      "previous",
      "volume",
      "mute",
      "shuffle",
      "repeat",
    ]),
    value: z.number().min(0).max(1).optional(),
  }),
  z.object({
    type: z.literal("mixerVolume"),
    pid: z.number().int().min(0).max(2147483647),
    value: z.number().min(0).max(1),
  }),
  z.object({ type: z.literal("saveGroup") }),
  z.object({ type: z.literal("activateGroup"), id }),
  z.object({ type: z.literal("deleteGroup"), id }),
  z.object({ type: z.literal("solo"), id }),
  z.object({
    type: z.literal("layout"),
    count: z.number().int().min(1).max(4),
  }),
  z.object({
    type: z.literal("ratios"),
    ratios: z.array(z.number().min(0.01).max(1)).min(1).max(4),
  }),
  z.object({
    type: z.literal("assign"),
    id,
    column: z.number().int().min(0).max(3),
    startIfStopped: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("service"),
    id,
    action: z.enum([
      "start",
      "stop",
      "reload",
      "reset",
      "mute",
      "external",
      "remove",
      "clearProfile",
      "hideElement",
    ]),
  }),
  z.object({ type: z.literal("saveService"), service: serviceSchema }),
  z.object({ type: z.literal("reorder"), ids: z.array(id).max(100) }),
  z.object({ type: z.literal("settings"), settings: settingsSchema }),
  z.object({ type: z.literal("overlay"), visible: z.boolean() }),
  z.object({
    type: z.literal("window"),
    action: z.enum(["minimize", "maximize", "close", "quit"]),
  }),
  z.object({
    type: z.literal("diagnostics"),
    action: z.enum(["logs", "data"]),
  }),
  z.object({ type: z.literal("resetLayout") }),
  z.object({
    type: z.literal("update"),
    action: z.enum(["check", "download", "install"]),
  }),
]);
export type Command = z.input<typeof commandSchema>;
export type WidgetData = {
  cpu: number;
  memory: number;
  gpu?: number;
  gpuName?: string;
  mixer: { pid: number; name: string; volume: number; muted: boolean }[];
  mixerError?: string;
  spotify?: {
    title: string;
    artist: string;
    cover: string;
    paused: boolean;
    volume: number;
    available: boolean;
    shuffle?: boolean;
    repeat?: boolean;
    repeatOne?: boolean;
  };
};
export type Bridge = {
  widgets: () => Promise<WidgetData>;
  snapshot: () => Promise<Snapshot>;
  command: (c: Command) => Promise<void>;
  subscribe: (fn: (s: Snapshot) => void) => () => void;
};
