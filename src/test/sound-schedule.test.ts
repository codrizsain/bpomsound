import { describe, expect, it } from "vitest";
import { dueSoundJobs } from "@/lib/sound-schedule";
import { normalizeSettings } from "@/lib/sound-settings";

const settings = () => normalizeSettings({ active: true, leaving: {
  warn: { time: "15:55", repeatTime: "15:58", fileName: "Peringatan.mp3" },
  out: { time: "16:00", repeatTime: "16:05", fileName: "Pulang.mp3" },
} });
const monday = (hour: number, minute: number) => new Date(2026, 9, 26, hour, minute);

describe("Leaving sound second playback", () => {
  it("plays the warning audio at 15:55 and again at its configured 15:58 time", () => {
    expect(dueSoundJobs(settings(), monday(15, 55)).map(j => j.audioKey)).toEqual(["leaving-warn"]);
    expect(dueSoundJobs(settings(), monday(15, 58)).map(j => j.audioKey)).toEqual(["leaving-warn"]);
    expect(dueSoundJobs(settings(), monday(15, 57))).toEqual([]);
  });
  it("plays leaving audio at 16:00 and again at its configured 16:05 time", () => {
    expect(dueSoundJobs(settings(), monday(16, 0)).map(j => j.audioKey)).toEqual(["leaving-out"]);
    expect(dueSoundJobs(settings(), monday(16, 5)).map(j => j.audioKey)).toEqual(["leaving-out"]);
  });
  it("keeps both leaving times inactive outside Monday through Thursday", () => {
    expect(dueSoundJobs(settings(), new Date(2026, 9, 23, 15, 58))).toEqual([]);
    expect(dueSoundJobs(settings(), new Date(2026, 9, 24, 16, 5))).toEqual([]);
    expect(dueSoundJobs(settings(), new Date(2026, 9, 25, 16, 0))).toEqual([]);
  });
  it("honors master and individual slot activation at the second time", () => {
    const s = settings();
    s.active = false;
    expect(dueSoundJobs(s, monday(16, 5))).toEqual([]);
    s.active = true;
    s.leaving.out.enabled = false;
    expect(dueSoundJobs(s, monday(16, 5))).toEqual([]);
  });
  it("does not duplicate a sound when both times are equal", () => {
    const s = settings();
    s.leaving.out.repeatTime = "16:00";
    expect(dueSoundJobs(s, monday(16, 0))).toHaveLength(1);
  });
  it("keeps second times optional for old settings and rejects invalid values", () => {
    expect(normalizeSettings({}).leaving.warn.repeatTime).toBe("");
    expect(normalizeSettings({ leaving: { out: { repeatTime: "25:00" } } }).leaving.out.repeatTime).toBe("");
    expect(normalizeSettings(JSON.parse(JSON.stringify(settings()))).leaving.out.repeatTime).toBe("16:05");
  });
});