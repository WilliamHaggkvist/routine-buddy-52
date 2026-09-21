import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/BottomNav";
import { CheckRow } from "@/components/CheckRow";
import { useDashboard, useRefreshDashboard } from "@/hooks/useDashboard";
import { deleteRoutine, deleteStep, saveRoutine, saveStep, toggleStep } from "@/lib/app.functions";
import { shortTime, WEEKDAY_LABELS } from "@/lib/day";
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

function RoutinesPage() {
  const { data, day } = useDashboard();
  const refresh = useRefreshDashboard();
  const saveRoutineFn = useServerFn(saveRoutine);
  const deleteRoutineFn = useServerFn(deleteRoutine);
  const saveStepFn = useServerFn(saveStep);
  const deleteStepFn = useServerFn(deleteStep);
  const toggleStepFn = useServerFn(toggleStep);

  const [newRoutine, setNewRoutine] = useState("");
  const [newStep, setNewStep] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);

  const routines = data?.routines ?? [];

  async function addRoutine() {
    const name = newRoutine.trim();
    if (!name) return;
    setNewRoutine("");
    await saveRoutineFn({ data: { name, emoji: "✨" } });
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

  return (
    <AppShell>
      <h1 className="font-display text-2xl text-foreground">Rutiner</h1>
      <p className="mt-1 text-sm text-muted-foreground">Checklistor som nollställs varje dag.</p>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input
          value={newRoutine}
          onChange={(e) => setNewRoutine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addRoutine();
          }}
          placeholder="Ny rutin, t.ex. Hudvård"
          className="h-14 rounded-2xl text-base"
        />
        <button
          type="button"
          onClick={addRoutine}
          aria-label="Lägg till rutin"
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {routines.map((r: any) => (
          <div key={r.id} className="overflow-hidden rounded-3xl border border-border bg-card p-3">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-xl">{r.emoji}</span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {shortTime(r.window_start)}–{shortTime(r.window_end)} · {r.steps.length} steg
                </p>
              </div>
              <Switch
                className="shrink-0"
                checked={r.is_active}
                onCheckedChange={async (v) => {
                  await saveRoutineFn({ data: { id: r.id, name: r.name, isActive: v } });
                  refresh();
                }}
              />
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(r, i)}
                  className={cn(
                    "min-h-10 rounded-xl px-0 text-xs font-bold transition-colors",
                    (r.days ?? []).includes(i)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="min-w-0 text-xs font-semibold text-muted-foreground">
                Börjar
                <Input
                  type="time"
                  defaultValue={shortTime(r.window_start) ?? "06:00"}
                  onBlur={async (e) => {
                    await saveRoutineFn({ data: { id: r.id, name: r.name, windowStart: e.target.value } });
                    refresh();
                  }}
                  className="mt-1 h-12 w-full min-w-0 rounded-xl px-2 text-sm"
                />
              </label>
              <label className="min-w-0 text-xs font-semibold text-muted-foreground">
                Slutar
                <Input
                  type="time"
                  defaultValue={shortTime(r.window_end) ?? "23:59"}
                  onBlur={async (e) => {
                    await saveRoutineFn({ data: { id: r.id, name: r.name, windowEnd: e.target.value } });
                    refresh();
                  }}
                  className="mt-1 h-12 w-full min-w-0 rounded-xl px-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-3 space-y-1.5">
              {r.steps.map((s: any) => (
                <CheckRow
                  key={s.id}
                  size="sm"
                  title={s.title}
                  done={s.done}
                  onToggle={async () => {
                    await toggleStepFn({ data: { stepId: s.id, routineId: r.id, day, done: !s.done } });
                    refresh();
                  }}
                  trailing={
                    editing === r.id ? (
                      <button
                        type="button"
                        aria-label="Ta bort steg"
                        onClick={async () => {
                          await deleteStepFn({ data: { id: s.id } });
                          refresh();
                        }}
                        className="grid size-10 place-items-center rounded-xl bg-secondary text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null
                  }
                />
              ))}
            </div>

            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                value={newStep[r.id] ?? ""}
                onChange={(e) => setNewStep((s) => ({ ...s, [r.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addStep(r.id, r.steps.length);
                }}
                placeholder="Nytt steg"
                className="h-12 rounded-xl"
              />
              <button
                type="button"
                onClick={() => addStep(r.id, r.steps.length)}
                aria-label="Lägg till steg"
                className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"
              >
                <Plus className="size-5" />
              </button>
            </div>

            <div className="mt-3 flex justify-between">
              <button
                type="button"
                onClick={() => setEditing(editing === r.id ? null : r.id)}
                className="min-h-10 text-xs font-bold text-primary"
              >
                {editing === r.id ? "Klar med ändringar" : "Ändra steg"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteRoutineFn({ data: { id: r.id } });
                  toast("Rutinen är borta");
                  refresh();
                }}
                className="min-h-10 text-xs font-bold text-destructive"
              >
                Ta bort rutin
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
