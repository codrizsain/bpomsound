import { LEAVING_LABELS, LEAVING_SLOTS, ORDER, type Settings } from "./sound-settings";

export type SoundJob = { audioKey: string; name: string; time: string };

// Both leaving times share one stored audio file. Equal times fire only once.
export function dueSoundJobs(settings: Settings, now: Date): SoundJob[] {
  const day = now.getDay();
  if (!settings.active || !ORDER.includes(day)) return [];
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const jobs: SoundJob[] = [];
  const morning = settings.days[day];
  if (morning?.enabled && morning.time === time) {
    jobs.push({ audioKey: `day-${day}`, name: morning.title, time });
  }
  for (const key of LEAVING_SLOTS) {
    const slot = settings.leaving[key];
    if (slot.enabled && (slot.time === time || slot.repeatTime === time)) {
      jobs.push({ audioKey: `leaving-${key}`, name: slot.fileName ? `${LEAVING_LABELS[key]}: ${slot.fileName}` : LEAVING_LABELS[key], time });
    }
  }
  return jobs;
}