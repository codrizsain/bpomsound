import { describe, expect, it } from "vitest";
import { DEFAULTS, normalizeSettings, ORDER } from "@/lib/sound-settings";

describe("BPOM schedule rules", () => {
  it("only supports Monday through Thursday, including old saved schedules", () => {
    expect(ORDER).toEqual([1, 2, 3, 4]);
    expect(Object.keys(normalizeSettings({ days: { 5: { enabled: true }, 6: {}, 0: {} } }).days)).toEqual(["1", "2", "3", "4"]);
  });
  it("uses the exact uploaded filename instead of preset instrument names", () => {
    const s = normalizeSettings({ days: { 1: { title: "Instrumen - Hymne Universitas Royal", fileName: "Lagu BPOM.mp3" } } });
    expect(s.days[1]?.title).toBe("Lagu BPOM.mp3");
    expect(DEFAULTS.days[1]?.title).toBe("Belum ada audio");
  });
  it("preserves saved schedule preferences after reopening", () => {
    const s = normalizeSettings({ active: true, volume: 0.35, keepAlive: false, wakeLock: true, days: { 2: { enabled: false, time: "09:45", fileName: "Pengumuman.wav" } } });
    expect(normalizeSettings(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(s.days[2]?.time).toBe("09:45");
  });
});