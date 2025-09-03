"use client";

import { useEffect, useState } from "react";
import { playAlert, SOUND_MAP, SoundKey } from "@/lib/playAlert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { createClient } from "@/lib/supabase/browser";
import { Input } from "@/components/ui/input";

const OPTIONS = Object.keys(SOUND_MAP) as SoundKey[];

interface Props {
  userId: string;
  initialSound: SoundKey;
  initialVolume: number; // percent 0-100
  initialRepeat?: boolean;
  initialRepeatSecs?: number;
}

export default function SoundSettingsForm({ userId, initialSound, initialVolume, initialRepeat = false, initialRepeatSecs = 5 }: Props) {
  const supabase = createClient();
  const [choice, setChoice] = useState<SoundKey>(initialSound);
  const [volume, setVolume] = useState<number>(initialVolume); // percent
  const [repeat, setRepeat] = useState<boolean>(initialRepeat);
  const [repeatSecs, setRepeatSecs] = useState<number>(initialRepeatSecs);
  // no explicit save needed

  // load initial preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("tb_sound", initialSound);
    localStorage.setItem("tb_volume", (initialVolume / 100).toString());
  }, [initialSound, initialVolume]);

  function selectSound(val: SoundKey) {
    setChoice(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("tb_sound", val);
    }
    supabase.from("user_preferences").upsert({ user_id: userId, sound_key: val }).then(() => {});
    playAlert(val);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const pct = Number(e.target.value);
    setVolume(pct);
    const frac = pct / 100;
    if (typeof window !== "undefined") {
      localStorage.setItem("tb_volume", frac.toString());
    }
    supabase.from("user_preferences").upsert({ user_id: userId, sound_volume: frac }).then(() => {});
  }

  function handleVolumeCommit() {
    playAlert(choice);
  }

  function handleRepeatToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.checked;
    setRepeat(val);
    localStorage.setItem("tb_repeat", val ? "1" : "0");
    supabase.from("user_preferences").upsert({ user_id: userId, sound_repeat: val }).then(() => {});
  }

  function handleRepeatSecs(e: React.ChangeEvent<HTMLInputElement>) {
    let num = Number(e.target.value);
    if (num < 1) num = 1;
    setRepeatSecs(num);
    localStorage.setItem("tb_repeat_secs", num.toString());
    supabase.from("user_preferences").upsert({ user_id: userId, sound_repeat_secs: num }).then(() => {});
  }

  return (
    <section className="space-y-4 mt-10">
      {/* <h2 className="text-lg font-semibold">Alert Sounds</h2> */}
      <RadioGroup
        value={choice}
        onValueChange={(v) => selectSound(v as SoundKey)}
        className="flex flex-col gap-3"
      >
        {OPTIONS.map((value) => {
          const label = value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          return (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={value} />
              <label htmlFor={value} className="text-sm">
                {label}
              </label>
            </div>
          );
        })}
      </RadioGroup>

      {/* Volume slider */}
      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium">Volume: {volume}%</label>
        <Slider
          min={0}
          max={100}
          value={[volume]}
          onValueChange={(val) => handleVolumeChange({ target: { value: val[0].toString() } } as any)}
          onValueCommit={(val) => {
            handleVolumeChange({ target: { value: val[0].toString() } } as any);
            handleVolumeCommit();
          }}
        />
      </div>

      {/* Repeat controls */}
      <div className="space-y-2 mt-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={repeat} onChange={handleRepeatToggle} /> Repeat until dismissed
        </label>
        {repeat && (
          <div className="flex items-center gap-2">
            <Input type="number" min={1} value={repeatSecs} onChange={handleRepeatSecs} className="w-20" />
            <span className="text-sm">seconds between chimes</span>
          </div>
        )}
      </div>
      {/* selection auto-saves & plays */}
    </section>
  );
} 