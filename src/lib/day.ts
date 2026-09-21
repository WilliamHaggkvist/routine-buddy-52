export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekdayOf(d: Date = new Date()): number {
  return d.getDay(); // 0 = söndag
}

export const WEEKDAY_LABELS = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "God natt";
  if (h < 10) return "God morgon";
  if (h < 13) return "Hej";
  if (h < 18) return "God eftermiddag";
  return "God kväll";
}

export function shortTime(t: string | null | undefined): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

export function last7Days(d: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(x.getDate() - i);
    out.push(todayKey(x));
  }
  return out;
}

export function currentWeekDays(d: Date = new Date()): string[] {
  const jsDay = d.getDay(); // 0 = söndag, 1 = måndag … 6 = lördag
  const daysSinceMonday = jsDay === 0 ? 6 : jsDay - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysSinceMonday);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    out.push(todayKey(x));
  }
  return out;
}

export const WEEKDAY_LABELS_MON_SUN = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

export function isSoon(due: string | null, now: Date = new Date()): boolean {
  if (!due) return true;
  const [h, m] = due.split(":").map(Number);
  const mins = (h ?? 0) * 60 + (m ?? 0);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return mins <= nowMins + 90;
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

export function tomorrowKey(day: string = todayKey()): string {
  return addDays(day, 1);
}

const MONTHS = ["jan", "feb", "mars", "april", "maj", "juni", "juli", "aug", "sep", "okt", "nov", "dec"];

/** Läsbart datum, t.ex. "Idag", "Imorgon", "Tis 23 sep" */
export function humanDate(dateKey: string | null | undefined, today: string = todayKey()): string | null {
  if (!dateKey) return null;
  if (dateKey === today) return "Idag";
  if (dateKey === addDays(today, 1)) return "Imorgon";
  if (dateKey === addDays(today, -1)) return "Igår";
  const d = new Date(`${dateKey}T12:00:00`);
  return `${WEEKDAY_LABELS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export const PRIORITIES = [
  { value: 1, label: "Prio 1" },
  { value: 2, label: "Prio 2" },
  { value: 3, label: "Prio 3" },
];

export function priorityLabel(priority: number | null | undefined): string | null {
  if (!priority) return null;
  return `Prio ${priority}`;
}

