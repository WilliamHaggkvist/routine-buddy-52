import { useEffect } from "react";
import { todayKey } from "@/lib/day";

type Settings = {
  push_enabled: boolean;
  inapp_enabled: boolean;
  morning_enabled: boolean;
  morning_time: string;
  evening_enabled: boolean;
  evening_time: string;
  routine_reminders: boolean;
  quiet_start: string;
  quiet_end: string;
  tone: string;
};

type Routine = {
  id: string;
  name: string;
  window_start: string;
  window_end: string;
  doneCount: number;
  steps: unknown[];
  activeToday: boolean;
};

function minutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function inQuietHours(s: Settings, now: Date) {
  const n = now.getHours() * 60 + now.getMinutes();
  const start = minutes(s.quiet_start);
  const end = minutes(s.quiet_end);
  return start > end ? n >= start || n < end : n >= start && n < end;
}

function say(tone: string, warm: string, neutral: string) {
  return tone === "rakt" ? neutral : warm;
}

function fire(key: string, title: string, body: string) {
  const stamp = `dagsform.notified.${key}`;
  if (localStorage.getItem(stamp)) return;
  localStorage.setItem(stamp, "1");
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body, tag: key });
  }
}

/** Lokala påminnelser medan appen är öppen eller sparad på hemskärmen. */
export function LocalReminders({
  settings,
  progress,
  routines,
}: {
  settings: Settings | null | undefined;
  progress: { done: number; total: number };
  routines: Routine[];
}) {
  useEffect(() => {
    if (!settings || !settings.push_enabled) return;

    const check = () => {
      const now = new Date();
      const day = todayKey(now);
      if (inQuietHours(settings, now)) return;
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const left = Math.max(0, progress.total - progress.done);

      if (settings.morning_enabled && nowMin >= minutes(settings.morning_time) && nowMin < minutes(settings.morning_time) + 60) {
        fire(
          `${day}.morgon`,
          say(settings.tone, "God morgon ☀️", "Morgonöversikt"),
          left === 0 ? "Inget inplanerat idag." : `${left} saker väntar idag. Ta den första.`,
        );
      }

      if (settings.evening_enabled && nowMin >= minutes(settings.evening_time) && nowMin < minutes(settings.evening_time) + 60) {
        fire(
          `${day}.kväll`,
          say(settings.tone, "Kvällskoll 🌙", "Kvällskoll"),
          left === 0 ? "Allt klart idag. Fint jobbat." : `${left} kvar – räcker det med en enda?`,
        );
      }

      if (settings.routine_reminders) {
        for (const r of routines) {
          if (!r.activeToday || r.steps.length === 0) continue;
          if (r.doneCount >= r.steps.length) continue;
          const start = minutes(r.window_start);
          if (nowMin >= start - 15 && nowMin < start + 15) {
            fire(
              `${day}.rutin.${r.id}`,
              say(settings.tone, `Snart dags för ${r.name.toLowerCase()}`, `${r.name}: börjar snart`),
              `${r.steps.length - r.doneCount} steg kvar.`,
            );
          }
        }
      }
    };

    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [settings, progress.done, progress.total, routines]);

  return null;
}
