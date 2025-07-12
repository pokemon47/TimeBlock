"use client";

// Mapping of sound keys to audio file paths in public/sounds
export const SOUND_MAP: Record<string, string> = {
  quick_stretch: "/sounds/quick_stretch.mp3",
  error_note: "/sounds/error_note.mp3",
  system_notification: "/sounds/system_notif.mp3",
  modern_doorbell: "/sounds/modern_doorbell.mp3",
  drop_ping: "/sounds/drop_ping.mp3",
  two_note: "/sounds/two_note.mp3",
  subtle_ping: "/sounds/subtle_ui_ping.mp3",
  task_timer_beep: "/sounds/task_timer_beep.mp3",
  gentle_notification: "/sounds/gentle_notification.mp3",
  soft_alert_chime: "/sounds/soft_alert_chime.mp3",
};

export type SoundKey = keyof typeof SOUND_MAP;

export function playAlert(key?: SoundKey) {
  if (typeof window === "undefined") return;
  const stored = key ?? (localStorage.getItem("tb_sound") as SoundKey | null);
  const chosen = stored && SOUND_MAP[stored] ? stored : (Object.keys(SOUND_MAP)[0] as SoundKey);
  const src = SOUND_MAP[chosen];
  let vol = 0.8;
  if (typeof window !== "undefined") {
    const storedVol = parseFloat(localStorage.getItem("tb_volume") || "");
    if (!isNaN(storedVol)) {
      vol = Math.min(Math.max(storedVol, 0), 1);
    }
  }
  try {
    const audio = new Audio(src);
    audio.volume = vol;
    audio.play().catch(() => {});
  } catch {}
}

let repeatTimer: any = null;

export function startRepeatAlert(intervalSec: number) {
  stopRepeatAlert();
  playAlert();
  repeatTimer = setInterval(() => playAlert(), intervalSec * 1000);
}

export function stopRepeatAlert() {
  if (repeatTimer) {
    clearInterval(repeatTimer);
    repeatTimer = null;
  }
} 