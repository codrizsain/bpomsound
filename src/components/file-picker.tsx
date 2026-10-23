import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus,.webm,.aif,.aiff";

// A real, directly tapped file input also works in installed mobile browsers.
export function FilePicker({ label, accept, children, disabled = false, onSelect }: {
  label: string;
  accept: string;
  children: string;
  disabled?: boolean;
  onSelect: (file: File | undefined) => void;
}) {
  return (
    <Button asChild variant="outline" className={`relative h-11 min-w-0 overflow-hidden ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      <label>
        <Upload className="shrink-0" />
        <span className="min-w-0 truncate">{children}</span>
        <input type="file" aria-label={label} accept={accept} disabled={disabled}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(event) => { onSelect(event.target.files?.[0]); event.target.value = ""; }} />
      </label>
    </Button>
  );
}