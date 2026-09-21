/**
 * Server-only logic som räknar ut vilka påminnelser som ska skickas just nu
 * och skickar dem via push, e-post och in-app-notiser.
 */
import { sendWebPush, type PushPayload, type PushSubscription } from "./web-push.server";
import { TIME_BANDS } from "./day";

/** Tidsdelens namn, t.ex. "Förmiddag" */
function bandName(band: string | null | undefined): string | null {
  return TIME_BANDS.find((b) => b.value === band)?.label ?? null;
}

/** Klockslaget en uppgift ska påminnas på (tidsdel räknas som sitt riktvärde) */
function effectiveTime(task: { due_time?: string | null; time_band?: string | null }): string | null {
  const band = TIME_BANDS.find((b) => b.value === task.time_band);
  if (band) return band.time;
  return task.due_time ? task.due_time.slice(0, 5) : null;
}

type Tone = "varm" | "peppig" | "rakt";

function toneCopy(tone: Tone) {
  if (tone === "peppig") {
    return {
      morning: (n: number) => ({ title: "Dags att köra! ✦", body: n === 0 ? "Inget inbokat – ta dagen lugnt." : `${n} saker väntar. Börja med den lättaste!` }),
      evening: (n: number) => ({ title: n === 0 ? "Allt klart – snyggt jobbat!" : "Sista pushen!", body: n === 0 ? "Hela dagen avklarad. Njut av kvällen." : `${n} kvar. Även en räknas.` }),
      routine: (name: string) => ({ title: `${name} – snart dags!`, body: "Börjar om 15 minuter. Bocka av det du orkar." }),
      missed: (n: number) => ({ title: `${n} saker ligger kvar`, body: "Välj EN att göra idag. Resten kan släppas." }),
    };
  }
  if (tone === "rakt") {
    return {
      morning: (n: number) => ({ title: "Dagens lista", body: n === 0 ? "Inget planerat idag." : `${n} uppgifter idag.` }),
      evening: (n: number) => ({ title: "Kvällskoll", body: n === 0 ? "Allt avklarat." : `${n} kvar av dagens lista.` }),
      routine: (name: string) => ({ title: name, body: "Börjar om 15 minuter." }),
      missed: (n: number) => ({ title: `${n} missade uppgifter`, body: "Gör idag eller släpp." }),
    };
  }
  return {
    morning: (n: number) => ({ title: "God morgon ✦", body: n === 0 ? "Inget måste idag. Fin start." : `${n} saker på listan idag. Ta en i taget.` }),
    evening: (n: number) => ({ title: n === 0 ? "Allt klart idag" : "Kvällskoll", body: n === 0 ? "Hela dagen avbockad. Vila gott." : `${n} kvar – räcker gott att göra en.` }),
    routine: (name: string) => ({ title: `Snart dags för ${name.toLowerCase()}`, body: "Börjar om 15 minuter – ta stegen i din takt." }),
    missed: (n: number) => ({ title: `${n} saker ligger kvar`, body: "Ingen stress. Välj en att göra idag, eller släpp den." }),
  };
}

function localParts(now: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) map[part.type] = part.value;
  const day = `${map["year"]}-${map["month"]}-${map["day"]}`;
  const minutes = Number(map["hour"]) * 60 + Number(map["minute"]);
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return { day, minutes, weekday };
}

function toMinutes(time: string) {
  const [h, m] = time.slice(0, 5).split(":");
  return Number(h) * 60 + Number(m);
}

/** Är klockslaget precis passerat (inom fönstret) så att vi ska skicka nu? */
function justPassed(nowMinutes: number, targetMinutes: number, windowMinutes: number) {
  const diff = nowMinutes - targetMinutes;
  return diff >= 0 && diff < windowMinutes;
}

function inQuietHours(nowMinutes: number, start: string, end: string) {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === e) return false;
  return s < e ? nowMinutes >= s && nowMinutes < e : nowMinutes >= s || nowMinutes < e;
}

function dueToday(task: { due_date: string | null }, day: string) {
  return task.due_date === day;
}


type Reminder = { kind: string; payload: PushPayload };

export async function runReminders(now = new Date()) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;

  const { data: allSettings } = await db.from("notification_settings").select("*");
  const result = { users: 0, sent: 0, pushed: 0, skipped: 0, errors: [] as string[] };

  for (const settings of allSettings ?? []) {
    const userId = settings.user_id as string;
    const { data: profile } = await db
      .from("profiles")
      .select("display_name, email, timezone")
      .eq("id", userId)
      .maybeSingle();
    const timezone = profile?.timezone || "Europe/Stockholm";
    const { day, minutes, weekday } = localParts(now, timezone);
    result.users += 1;

    if (inQuietHours(minutes, settings.quiet_start, settings.quiet_end)) {
      result.skipped += 1;
      continue;
    }

    const [{ data: tasks }, { data: taskDone }, { data: routines }, { data: steps }, { data: stepDone }] =
      await Promise.all([
        db
          .from("tasks")
          .select("id, title, due_date, due_time, time_band")
          .eq("user_id", userId)
          .eq("is_archived", false)
          .is("parent_id", null),
        db.from("task_completions").select("task_id").eq("user_id", userId).eq("completed_on", day),
        db
          .from("routines")
          .select("id, name, window_start, window_end, days")
          .eq("user_id", userId)
          .eq("is_active", true),
        db.from("routine_steps").select("id, routine_id").eq("user_id", userId),
        db.from("routine_step_completions").select("step_id").eq("user_id", userId).eq("completed_on", day),
      ]);

    const doneTaskIds = new Set((taskDone ?? []).map((c: any) => c.task_id));
    const doneStepIds = new Set((stepDone ?? []).map((c: any) => c.step_id));
    const todayTasks = (tasks ?? []).filter((t: any) => dueToday(t, day));
    const openTasks = todayTasks.filter((t: any) => !doneTaskIds.has(t.id));
    const missedTasks = (tasks ?? []).filter(
      (t: any) => t.due_date && t.due_date < day && !doneTaskIds.has(t.id),
    );

    const activeRoutines = (routines ?? []).filter((r: any) => (r.days ?? []).includes(weekday));

    const copy = toneCopy((settings.tone ?? "varm") as Tone);
    const reminders: Reminder[] = [];

    if (settings.morning_enabled && justPassed(minutes, toMinutes(settings.morning_time), 60)) {
      const c = copy.morning(openTasks.length);
      reminders.push({ kind: "morning", payload: { ...c, url: "/idag", tag: "morning" } });
    }

    if (settings.evening_enabled && justPassed(minutes, toMinutes(settings.evening_time), 60)) {
      const openSteps = activeRoutines.reduce(
        (n: number, r: any) =>
          n + (steps ?? []).filter((s: any) => s.routine_id === r.id && !doneStepIds.has(s.id)).length,
        0,
      );
      const c = copy.evening(openTasks.length + openSteps);
      reminders.push({ kind: "evening", payload: { ...c, url: "/idag", tag: "evening" } });
    }

    if (settings.routine_reminders) {
      for (const r of activeRoutines) {
        const openSteps = (steps ?? []).filter((s: any) => s.routine_id === r.id && !doneStepIds.has(s.id));
        if (openSteps.length === 0) continue;
        // Påminn 15 minuter innan rutinens tidsfönster börjar.
        const target = Math.max(0, toMinutes(r.window_start) - 15);
        if (!justPassed(minutes, target, 20)) continue;
        const c = copy.routine(r.name);
        reminders.push({ kind: `routine:${r.id}`, payload: { ...c, url: "/idag", tag: `routine-${r.id}` } });
      }
    }

    if (settings.task_reminders !== false) {
      // Uppgifter med klockslag eller tidsdel: en notis per tidpunkt, alla uppgifter i samma notis.
      const groups = new Map<string, { time: string; band: string | null; titles: string[] }>();
      for (const t of openTasks as any[]) {
        const time = effectiveTime(t);
        if (!time) continue;
        const key = t.time_band ? `band:${t.time_band}` : `time:${time}`;
        const g = groups.get(key) ?? { time, band: (t.time_band ?? null) as string | null, titles: [] as string[] };
        g.titles.push(t.title);
        groups.set(key, g);
      }
      for (const [key, g] of groups) {
        if (!justPassed(minutes, toMinutes(g.time), 15)) continue;
        const label = bandName(g.band) ?? `kl ${g.time}`;
        const n = g.titles.length;
        const title = n === 1 ? g.titles[0]! : `${n} uppgifter · ${label}`;
        const body =
          n > 5
            ? `Du har fler än 5 uppgifter att ta dig an på ${label.toLowerCase()}. Börja med en.`
            : g.titles.join(" · ");
        reminders.push({ kind: `tasks:${key}`, payload: { title, body, url: "/idag", tag: `tasks-${key}` } });
      }
    }

    if (settings.missed_nudges && missedTasks.length > 0 && justPassed(minutes, 12 * 60, 120)) {
      const c = copy.missed(missedTasks.length);
      reminders.push({ kind: "missed", payload: { ...c, url: "/idag", tag: "missed" } });
    }

    if (reminders.length === 0) continue;

    const { data: subs } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    for (const reminder of reminders) {
      // Ett utskick per typ och dag – raden i reminder_sends är låset.
      const { error: lockError } = await db
        .from("reminder_sends")
        .insert({ user_id: userId, kind: reminder.kind, day });
      if (lockError) continue;
      result.sent += 1;

      if (settings.inapp_enabled) {
        await db.from("notifications").insert({
          user_id: userId,
          title: reminder.payload.title,
          body: reminder.payload.body ?? null,
          kind: reminder.kind.startsWith("routine") ? "routine" : reminder.kind,
        });
      }

      if (settings.push_enabled) {
        for (const sub of subs ?? []) {
          const res = await sendWebPush(sub as PushSubscription, reminder.payload);
          if (res.ok) {
            result.pushed += 1;
          } else {
            if (res.stale) await db.from("push_subscriptions").delete().eq("id", (sub as any).id);
            else result.errors.push(`push ${res.status}: ${res.error}`.slice(0, 200));
          }
        }
      }

    }
  }

  return result;
}
