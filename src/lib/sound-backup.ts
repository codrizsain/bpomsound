import { strFromU8, strToU8, unzip, zip } from "fflate";
import { getAudio, replaceAudio } from "./audio-db";
import { normalizeSettings, ORDER, SETTINGS_KEY, type Settings } from "./sound-settings";

type Backup = { format: "bpom-sound-backup"; version: 1; settings: Settings; audio: Record<number, { path: string; type: string }> };

export async function createBackup(settings: Settings): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const data: Backup = { format: "bpom-sound-backup", version: 1, settings: normalizeSettings(settings), audio: {} };
  for (const day of ORDER) {
    const blob = await getAudio(`day-${day}`);
    if (blob) {
      const path = `audio/day-${day}`;
      files[path] = new Uint8Array(await blob.arrayBuffer());
      data.audio[day] = { path, type: blob.type };
    } else {
      const cfg = data.settings.days[day];
      if (cfg) { cfg.fileName = undefined; cfg.title = "Belum ada audio"; }
    }
  }
  files["backup.json"] = strToU8(JSON.stringify(data));
  return new Promise((resolve, reject) => zip(files, { level: 0 }, (error, result) => error ? reject(error) : resolve(result)));
}

export async function readBackup(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => unzip(bytes, {
    filter: (entry) => (entry.name === "backup.json" || /^audio\/day-[1-4]$/.test(entry.name)) && entry.originalSize <= 512 * 1024 * 1024,
  }, (error, result) => error ? reject(error) : resolve(result)));
  const manifest = files["backup.json"];
  if (!manifest) throw new Error("File bukan cadangan BPOM yang valid.");
  const data = JSON.parse(strFromU8(manifest)) as Backup;
  if (data.format !== "bpom-sound-backup" || data.version !== 1 || !data.settings?.days || !data.audio || typeof data.audio !== "object") {
    throw new Error("Format cadangan tidak didukung.");
  }
  const settings = normalizeSettings(data.settings);
  const audio: Record<number, Blob> = {};
  for (const day of ORDER) {
    const entry = data.audio[day];
    const cfg = settings.days[day];
    if (!cfg) continue;
    if (entry) {
      const content = files[`audio/day-${day}`];
      if (entry.path !== `audio/day-${day}` || !content || !cfg.fileName) throw new Error("Audio dalam cadangan tidak lengkap.");
      audio[day] = new Blob([new Uint8Array(content)], { type: typeof entry.type === "string" ? entry.type : "" });
    } else if (cfg.fileName) throw new Error("Audio dalam cadangan tidak lengkap.");
  }
  return { settings, audio };
}

export async function restoreBackup(backup: Awaited<ReturnType<typeof readBackup>>) {
  // Confirm browser settings storage is writable before replacing any audio.
  const previous = localStorage.getItem(SETTINGS_KEY);
  localStorage.setItem(SETTINGS_KEY, previous ?? "{}");
  await replaceAudio(backup.audio);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings));
  return backup.settings;
}