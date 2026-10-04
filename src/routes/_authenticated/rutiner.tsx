import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Clock, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/BottomNav";
import { useDashboard, useRefreshDashboard } from "@/hooks/useDashboard";
import { deleteRoutine, deleteStep, saveRoutine, saveStep } from "@/lib/app.functions";
import { shortTime } from "@/lib/day";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rutiner")({
  head: () => ({
    meta: [
      { title: "Rutiner – Dagsform" },
      { name: "description", content: "Bygg rutiner som hudvård och kvällsrutin med steg, tidsfönster och veckodagar." },
      { property: "og:title", content: "Rutiner – Dagsform" },
      { property: "og:description", content: "Rutiner som checklistor med tidsfönster och veckodagar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoutinesPage,
});

const WEEKDAYS_MON_SUN = [
  { label: "Mån", value: 1 },
  { label: "Tis", value: 2 },
  { label: "Ons", value: 3 },
  { label: "Tor", value: 4 },
  { label: "Fre", value: 5 },
  { label: "Lör", value: 6 },
  { label: "Sön", value: 0 },
];

const EMOJI_OPTIONS = ["✨", "☀️", "🌙", "💧", "🏃", "🧘", "🍵", "🧹", "💊", "🛏️"];

function daysSummary(days?: number[] | null): string {
  if (!days || days.length === 0) return "Inga dagar valda";
  if (days.length === 7) return "Varje dag";
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return "Vardagar";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "Helger";
  return `${days.length} dagar i veckan`;
}

function RoutinesPage() {
  const { data } = useDashboard();
  const refresh = useRefreshDashboard();
  const saveRoutineFn = useServerFn(saveRoutine);
  const deleteRoutineFn = useServerFn(deleteRoutine);
  const saveStepFn = useServerFn(saveStep);
  const deleteStepFn = useServerFn(deleteStep);

  const [newRoutine, setNewRoutine] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("✨");
  const [newStep, setNewStep] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const routines = data?.routines ?? [];

  async function addRoutine() {
    const name = newRoutine.trim();
    if (!name) return;
    setNewRoutine("");
    const res = await saveRoutineFn({ data: { name, emoji: selectedEmoji } });
    if (res?.id) {
      setOpen((o) => ({ ...o, [res.id]: true }));
    }
    toast.success("Rutin skapad");
    refresh();
  }

  async function addStep(routineId: string, sortOrder: number) {
    const title = (newStep[routineId] ?? "").trim();
    if (!title) return;
    setNewStep((s) => ({ ...s, [routineId]: "" }));
    await saveStepFn({ data: { routineId, title, sortOrder } });
    refresh();
  }

  async function toggleDay(r: any, weekday: number) {
    const days: number[] = r.days ?? [];
    const next = days.includes(weekday) ? days.filter((d) => d !== weekday) : [...days, weekday].sort();
    await saveRoutineFn({ data: { id: r.id, name: r.name, days: next } });
    refresh();
  }

  async function setRoutineDays(r: any, days: number[]) {
    await saveRoutineFn({ data: { id: r.id, name: r.name, days } });
    refresh();
  }

  return (
    <AppShell>
      <h1 className="font-display text-2xl text-foreground">Rutiner</h1>
      <p className="mt-1 text-sm text-muted-foreground">Checklistor som nollställs varje dag.</p>

      {/* Skapa ny rutin */}
      <div className="mt-5 rounded-3xl border border-border bg-card p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Skapa ny rutin</p>
        
        {/* Emoji-val */}
        <div className="mt-2.5 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setSelectedEmoji(emoji)}
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl text-lg transition-transform active:scale-95",
                selectedEmoji === emoji ? "bg-primary/20 ring-2 ring-primary" : "bg-secondary hover:bg-secondary/80",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Input
            value={newRoutine}
            onChange={(e) => setNewRoutine(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addRoutine();
            }}
            placeholder="Rutinnamn, t.ex. Morgonrutin"
            className="h-14 rounded-2xl text-base bg-background"
          />
          <button
            type="button"
            onClick={addRoutine}
            aria-label="Lägg till rutin"
            className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground active:scale-95 transition-transform"
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Rutinlista */}
      <div className="mt-6 space-y-3.5">
        {routines.map((r: any) => {
          const isOpen = open[r.id] ?? (routines.length === 1);
          return (
            <div
              key={r.id}
              className="overflow-hidden rounded-3xl border border-border bg-card transition-shadow"
            >
              {/* Header / Översikt */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpen((o) => ({ ...o, [r.id]: !isOpen }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen((o) => ({ ...o, [r.id]: !isOpen }));
                  }
                }}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3.5 text-left cursor-pointer select-none"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-2xl">
                  {r.emoji}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-foreground text-base">{r.name}</p>
                    {!r.is_active && (
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Avstängd
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {shortTime(r.window_start)}–{shortTime(r.window_end)} · {r.steps.length} steg · {daysSummary(r.days)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={async (v) => {
                        await saveRoutineFn({ data: { id: r.id, name: r.name, isActive: v } });
                        refresh();
                      }}
                    />
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-5 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </div>
              </div>

              {/* Expanderad redigeringsdel */}
              {isOpen && (
                <div className="border-t border-border/60 p-4 space-y-4">
                  {/* Modul 1: Tidsfönster & Aktiva dagar */}
                  <div className="rounded-2xl border border-border/60 bg-secondary/35 p-3.5 space-y-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <Clock className="size-3.5" /> Tidsfönster
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground block mb-1">Från kl</span>
                        <Input
                          type="time"
                          defaultValue={shortTime(r.window_start) ?? "06:00"}
                          onBlur={async (e) => {
                            await saveRoutineFn({ data: { id: r.id, name: r.name, windowStart: e.target.value } });
                            refresh();
                          }}
                          className="h-12 w-full rounded-xl bg-card text-center font-semibold text-sm border-border/80"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground block mb-1">Till kl</span>
                        <Input
                          type="time"
                          defaultValue={shortTime(r.window_end) ?? "23:59"}
                          onBlur={async (e) => {
                            await saveRoutineFn({ data: { id: r.id, name: r.name, windowEnd: e.target.value } });
                            refresh();
                          }}
                          className="h-12 w-full rounded-xl bg-card text-center font-semibold text-sm border-border/80"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Veckodagar
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRoutineDays(r, [1, 2, 3, 4, 5])}
                            className="text-[11px] font-semibold text-primary hover:underline px-1"
                          >
                            Vardagar
                          </button>
                          <span className="text-muted-foreground text-[11px]">·</span>
                          <button
                            type="button"
                            onClick={() => setRoutineDays(r, [1, 2, 3, 4, 5, 6, 0])}
                            className="text-[11px] font-semibold text-primary hover:underline px-1"
                          >
                            Alla
                          </button>
                          <span className="text-muted-foreground text-[11px]">·</span>
                          <button
                            type="button"
                            onClick={() => setRoutineDays(r, [6, 0])}
                            className="text-[11px] font-semibold text-primary hover:underline px-1"
                          >
                            Helg
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {WEEKDAYS_MON_SUN.map(({ label, value }) => {
                          const active = (r.days ?? []).includes(value);
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => toggleDay(r, value)}
                              className={cn(
                                "min-h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center select-none active:scale-95",
                                active
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "bg-card text-muted-foreground border border-border/80 hover:text-foreground",
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Modul 2: Steg i rutinen */}
                  <div className="rounded-2xl border border-border/60 bg-secondary/35 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Steg ({r.steps.length})
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {r.steps.map((s: any, idx: number) => (
                        <div
                          key={s.id}
                          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2 min-h-12"
                        >
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-bold text-muted-foreground">
                            {idx + 1}
                          </span>
                          <span className="truncate text-sm font-medium text-foreground">{s.title}</span>
                          <button
                            type="button"
                            aria-label={`Ta bort steg ${s.title}`}
                            onClick={async () => {
                              await deleteStepFn({ data: { id: s.id } });
                              refresh();
                            }}
                            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                      {r.steps.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-1 px-1">
                          Inga steg än. Lägg till det första nedan.
                        </p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 pt-1">
                      <Input
                        value={newStep[r.id] ?? ""}
                        onChange={(e) => setNewStep((st) => ({ ...st, [r.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void addStep(r.id, r.steps.length);
                        }}
                        placeholder="Lägg till ett steg..."
                        className="h-12 rounded-xl text-sm bg-card border-border/80"
                      />
                      <button
                        type="button"
                        onClick={() => addStep(r.id, r.steps.length)}
                        aria-label="Lägg till steg"
                        className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground active:scale-95"
                      >
                        <Plus className="size-5" />
                      </button>
                    </div>
                  </div>

                  {/* Modul 3: Redigera namn & Ta bort rutin */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteRoutineFn({ data: { id: r.id } });
                        toast("Rutinen är borttagen");
                        refresh();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive hover:underline py-2 active:scale-95"
                    >
                      <Trash2 className="size-3.5" />
                      Ta bort rutin
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen((o) => ({ ...o, [r.id]: false }))}
                      className="min-h-10 px-4 rounded-xl bg-secondary text-xs font-bold text-secondary-foreground active:scale-95 transition-transform"
                    >
                      Klar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {routines.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
            <Sparkles className="mx-auto size-8 text-muted-foreground/60 mb-2" />
            <p className="font-semibold text-foreground">Inga rutiner än</p>
            <p className="mt-1 text-xs">Skapa din första rutin ovan för att få en bra start på dagen.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
