export const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const ORDER = [1, 2, 3, 4];
export const SETTINGS_KEY = "bpom-sound-settings";
export type DayCfg = { enabled: boolean; time: string; title: string; fileName?: string | undefined };
export type Settings = { active: boolean; volume: number; keepAlive: boolean; wakeLock: boolean; days: Record<number, DayCfg> };
export const DEFAULTS: Settings = {
  active: false, volume: 0.8, keepAlive: true, wakeLock: false,
  days: Object.fromEntries(ORDER.map((day) => [day, { enabled: true, time: "10:00", title: "Belum ada audio" }])),
};
export function normalizeSettings(value: unknown): Settings {
  const p = value && typeof value === "object" ? value as Partial<Settings> : {};
  return {
    active: p.active === true,
    volume: typeof p.volume === "number" && Number.isFinite(p.volume) ? Math.min(1, Math.max(0, p.volume)) : 0.8,
    keepAlive: typeof p.keepAlive === "boolean" ? p.keepAlive : true,
    wakeLock: p.wakeLock === true,
    days: Object.fromEntries(ORDER.map((day) => {
      const c = p.days?.[day];
      const fileName = typeof c?.fileName === "string" && c.fileName ? c.fileName : undefined;
      return [day, {
        enabled: typeof c?.enabled === "boolean" ? c.enabled : true,
        time: typeof c?.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.time) ? c.time : "10:00",
        title: fileName ?? "Belum ada audio", fileName,
      }];
    })),
  };
}