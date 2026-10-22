export const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const ORDER = [1, 2, 3, 4];
export const LEAVING_SLOTS = ["warn", "out"] as const;
export type LeavingKey = (typeof LEAVING_SLOTS)[number];
export const LEAVING_LABELS: Record<LeavingKey, string> = { warn: "Sound Peringatan Pulang", out: "Sound Pulang" };
export const SETTINGS_KEY = "bpom-sound-settings";
export type DayCfg = { enabled: boolean; time: string; title: string; fileName?: string | undefined };
export type SlotCfg = DayCfg;
export type Settings = { active: boolean; volume: number; keepAlive: boolean; wakeLock: boolean; days: Record<number, DayCfg>; leaving: Record<LeavingKey, SlotCfg> };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function normSlot(c: unknown, defTime: string): SlotCfg {
  const s = c && typeof c === "object" ? c as Partial<SlotCfg> : {};
  const fileName = typeof s.fileName === "string" && s.fileName ? s.fileName : undefined;
  return {
    enabled: typeof s.enabled === "boolean" ? s.enabled : true,
    time: typeof s.time === "string" && TIME_RE.test(s.time) ? s.time : defTime,
    title: fileName ?? "Belum ada audio", fileName,
  };
}
export const DEFAULTS: Settings = {
  active: false, volume: 0.8, keepAlive: true, wakeLock: false,
  days: Object.fromEntries(ORDER.map((day) => [day, { enabled: true, time: "10:00", title: "Belum ada audio" }])),
  leaving: { warn: { enabled: true, time: "15:55", title: "Belum ada audio" }, out: { enabled: true, time: "16:00", title: "Belum ada audio" } },
};
export function normalizeSettings(value: unknown): Settings {
  const p = value && typeof value === "object" ? value as Partial<Settings> : {};
  return {
    active: p.active === true,
    volume: typeof p.volume === "number" && Number.isFinite(p.volume) ? Math.min(1, Math.max(0, p.volume)) : 0.8,
    keepAlive: typeof p.keepAlive === "boolean" ? p.keepAlive : true,
    wakeLock: p.wakeLock === true,
    days: Object.fromEntries(ORDER.map((day) => [day, normSlot(p.days?.[day], "10:00")])),
    leaving: { warn: normSlot(p.leaving?.warn, "15:55"), out: normSlot(p.leaving?.out, "16:00") },
  };
}
