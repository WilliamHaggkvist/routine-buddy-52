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

export function isSoon(due: string | null, now: Date = new Date()): boolean {
  if (!due) return true;
  const [h, m] = due.split(":").map(Number);
  const mins = (h ?? 0) * 60 + (m ?? 0);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return mins <= nowMins + 90;
}
