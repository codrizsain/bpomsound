import { strFromU8, strToU8, unzip, zip } from "fflate";
import { getAudio, replaceAudio } from "./audio-db";
import { LEAVING_SLOTS, normalizeSettings, ORDER, SETTINGS_KEY, type Settings } from "./sound-settings";

type Backup = { format: "bpom-sound-backup"; version: 1; settings: Settings; audio: Record<string, { path: string; type: string }> };

// Every sound slot the archive can carry: per-day morning sounds plus the two leaving sounds.
const SOUND_KEYS = [...ORDER.map((day) => `day-${day}`), ...LEAVING_SLOTS.map((k) => `leaving-${k}`)];

export async function createBackup(settings: Settings): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const data: Backup = { format: "bpom-sound-backup", version: 1, settings: normalizeSettings(settings), audio: {} };
  for (const key of SOUND_KEYS) {
    const blob = await getAudio(key);
    if (blob) {
      const path = `audio/${key}`;
      files[path] = new Uint8Array(await blob.arrayBuffer());
      data.audio[key] = { path, type: blob.type };
    } else {
      const slot = key.startsWith("leaving-") ? data.settings.leaving[key.slice("leaving-".length) as "warn" | "out"] : data.settings.days[Number(key.slice("day-".length))];
      if (slot) { slot.fileName = undefined; slot.title = "Belum ada audio"; }
    }
  }
  files["backup.json"] = strToU8(JSON.stringify(data));
  return new Promise((resolve, reject) => zip(files, { level: 0 }, (error, result) => error ? reject(error) : resolve(result)));
}

export async function readBackup(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => unzip(bytes, {
    filter: (entry) => (entry.name === "backup.json" || /^audio\/(day-[1-4]|leaving-(warn|out))$/.test(entry.name)) && entry.originalSize <= 512 * 1024 * 1024,
  }, (error, result) => error ? reject(error) : resolve(result)));
  const manifest = files["backup.json"];
  if (!manifest) throw new Error("File bukan cadangan BPOM yang valid.");
  const data = JSON.parse(strFromU8(manifest)) as Backup;
  if (data.format !== "bpom-sound-backup" || data.version !== 1 || !data.settings?.days || !data.audio || typeof data.audio !== "object") {
    throw new Error("Format cadangan tidak didukung.");
  }
  const settings = normalizeSettings(data.settings);
  const audio: Record<string, Blob> = {};
  const collect = (key: string, fileName: string | undefined, entry?: { path: unknown; type: unknown }) => {
    if (entry) {
      const content = files[`audio/${key}`];
      if (entry.path !== `audio/${key}` || !content || !fileName) throw new Error("Audio dalam cadangan tidak lengkap.");
      audio[key] = new Blob([new Uint8Array(content)], { type: typeof entry.type === "string" ? entry.type : "" });
    } else if (fileName) throw new Error("Audio dalam cadangan tidak lengkap.");
  };
  for (const day of ORDER) collect(`day-${day}`, settings.days[day]?.fileName, data.audio[day]);
  for (const k of LEAVING_SLOTS) collect(`leaving-${k}`, settings.leaving[k]?.fileName, data.audio[`leaving-${k}`]);
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
