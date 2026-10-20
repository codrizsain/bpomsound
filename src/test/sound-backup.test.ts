// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/audio-db", () => ({ getAudio: vi.fn(), replaceAudio: vi.fn() }));
import { getAudio, replaceAudio } from "@/lib/audio-db";
import { createBackup, readBackup, restoreBackup } from "@/lib/sound-backup";
import { normalizeSettings, SETTINGS_KEY } from "@/lib/sound-settings";

describe("Offline backup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });
  it("round-trips the saved time and actual audio bytes without network access", async () => {
    const bytes = new Uint8Array([82, 73, 70, 70, 0, 1, 2, 3]);
    vi.mocked(getAudio).mockImplementation(async (key) => key === "day-1" ? new Blob([bytes], { type: "audio/wav" }) : undefined);
    const s = normalizeSettings({ days: { 1: { enabled: true, time: "08:15", fileName: "Sound.wav" } } });
    const archive = await createBackup(s);
    const restored = await readBackup(new Blob([new Uint8Array(archive)]));
    expect(restored.settings.days[1]?.time).toBe("08:15");
    expect(restored.settings.days[1]?.fileName).toBe("Sound.wav");
    const audio = restored.audio[1];
    expect(audio).toBeDefined();
    if (!audio) throw new Error("Restored audio is missing");
    expect(new Uint8Array(await audio.arrayBuffer())).toEqual(bytes);
    await restoreBackup(restored);
    expect(replaceAudio).toHaveBeenCalledWith(restored.audio);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}").days[1].time).toBe("08:15");
  });
  it("rejects invalid backups without replacing existing sound", async () => {
    await expect(readBackup(new Blob(["not a ZIP"]))).rejects.toThrow();
    expect(replaceAudio).not.toHaveBeenCalled();
  });
});