import { z } from "zod";
export const permissionSchema = z.enum(["ask", "allow", "deny"]);
export const serviceSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  name: z.string().trim().min(1).max(60),
  url: z.string().max(2048),
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
export const configSchema = z.object({
  version: z.literal(1),
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
export type Bridge = {
  snapshot: () => Promise<Snapshot>;
  command: (c: Command) => Promise<void>;
  subscribe: (fn: (s: Snapshot) => void) => () => void;
};
