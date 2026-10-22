import { describe, expect, it } from "vitest";
import { DEFAULTS, LEAVING_LABELS, normalizeSettings, ORDER } from "@/lib/sound-settings";

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
  it("adds the two leaving sounds at their default times with the requested labels", () => {
    expect(LEAVING_LABELS.warn).toBe("Sound Peringatan Pulang");
    expect(LEAVING_LABELS.out).toBe("Sound Pulang");
    expect(DEFAULTS.leaving.warn).toMatchObject({ enabled: true, time: "15:55" });
    expect(DEFAULTS.leaving.out).toMatchObject({ enabled: true, time: "16:00" });
  });
  it("gives legacy saved settings the leaving sounds with no uploaded audio", () => {
    const legacy = normalizeSettings({ days: { 1: { fileName: "Lagu BPOM.mp3" } } });
    expect(legacy.leaving.warn).toMatchObject({ enabled: true, time: "15:55", title: "Belum ada audio" });
    expect(legacy.leaving.out.fileName).toBeUndefined();
  });
  it("keeps uploaded leaving sound filenames and custom times", () => {
    const s = normalizeSettings({ leaving: { warn: { time: "15:50", fileName: "Peringatan Pulang.mp3" }, out: { enabled: false } } });
    expect(s.leaving.warn.time).toBe("15:50");
    expect(s.leaving.warn.title).toBe("Peringatan Pulang.mp3");
    expect(s.leaving.out.enabled).toBe(false);
    expect(s.leaving.out.time).toBe("16:00");
    expect(normalizeSettings(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});
