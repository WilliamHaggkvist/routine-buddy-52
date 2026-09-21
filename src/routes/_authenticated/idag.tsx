import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Flame, Plus, Sparkles, Sunrise, X } from "lucide-react";
import { toast } from "sonner";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { AppShell } from "@/components/BottomNav";
import { LocalReminders } from "@/components/LocalReminders";
import { CheckRow } from "@/components/CheckRow";
import { ProgressRing } from "@/components/ProgressRing";
import { useDashboard, useRefreshDashboard } from "@/hooks/useDashboard";
import { createTask, getSettings, markNudgeRead, pushNudge, toggleStep, toggleTask, updateTask } from "@/lib/app.functions";
import { greeting, isSoon, last7Days, shortTime, WEEKDAY_LABELS } from "@/lib/day";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/idag")({
  head: () => ({
    meta: [
      { title: "Idag – Dagsform" },
      { name: "description", content: "Dagens uppgifter och rutiner med visuell progress, streak och poäng." },
      { property: "og:title", content: "Idag – Dagsform" },
      { property: "og:description", content: "Dagens uppgifter och rutiner med visuell progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TodayPage,
});

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
        {title}
        {typeof count === "number" ? ` (${count})` : ""}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function TodayPage() {
  const { data, isLoading, day } = useDashboard();
  const refresh = useRefreshDashboard();
  const toggleTaskFn = useServerFn(toggleTask);
  const toggleStepFn = useServerFn(toggleStep);
  const createTaskFn = useServerFn(createTask);
  const updateTaskFn = useServerFn(updateTask);
  const markRead = useServerFn(markNudgeRead);
  const fetchSettings = useServerFn(getSettings);
  const nudge = useServerFn(pushNudge);
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchSettings({ data: undefined as never }),
    staleTime: 60_000,
  });

  const [newTitle, setNewTitle] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const week = useMemo(() => last7Days(), []);
  const summaries = new Map((data?.summaries ?? []).map((s: any) => [s.day, s]));

  const tasks = data?.tasks ?? [];
  const todayTasks = tasks.filter((t: any) => t.bucket === "today");
  const nu = todayTasks.filter((t: any) => !t.done && isSoon(t.due_time));
  const senare = todayTasks.filter((t: any) => !t.done && !isSoon(t.due_time));
  const klara = todayTasks.filter((t: any) => t.done);
  const missade = tasks.filter((t: any) => t.bucket === "missed");
  const routines = (data?.routines ?? []).filter((r: any) => r.activeToday);

  async function onToggleTask(t: any) {
    await toggleTaskFn({ data: { taskId: t.id, day, done: !t.done } });
    if (!t.done) toast.success("Snyggt! ✦ +5 poäng");
    refresh();
  }

  async function onToggleStep(routineId: string, s: any) {
    await toggleStepFn({ data: { stepId: s.id, routineId, day, done: !s.done } });
    refresh();
  }

  async function add() {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    await createTaskFn({ data: { title, day } });
    refresh();
  }

  async function moveToToday(t: any) {
    await updateTaskFn({ data: { id: t.id, patch: { due_date: day }, day } });
    toast.success("Flyttad till idag");
    refresh();
  }

  async function letGo(t: any) {
    await updateTaskFn({ data: { id: t.id, patch: { is_archived: true }, day } });
    toast("Släppt – inget dåligt samvete");
    refresh();
  }

  const s = settings.data as any;

  useEffect(() => {
    if (!data || !s?.inapp_enabled || !s?.missed_nudges) return;
    if (missade.length === 0) return;
    const flag = `dagsform.missednudge.${day}`;
    if (localStorage.getItem(flag)) return;
    localStorage.setItem(flag, "1");
    void nudge({
      data: {
        title: `${missade.length} sak${missade.length > 1 ? "er" : ""} ligger kvar`,
        body: "Välj en att göra idag, eller släpp den. Båda är okej.",
        kind: "missed",
      },
    }).then(() => refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, s?.inapp_enabled, s?.missed_nudges, missade.length, day]);

  const progress = data?.progress ?? { done: 0, total: 0 };
  const complete = progress.total > 0 && progress.done >= progress.total;

  return (
    <AppShell>
      <LocalReminders settings={s} progress={progress} routines={routines} />
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{greeting()}</p>
          <h1 className="truncate font-display text-2xl text-foreground">
            {data?.profile?.display_name || "Välkommen"}
          </h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-warm px-3 py-1.5 text-sm font-bold text-warm-foreground">
            <Flame className="size-4" /> {data?.streak ?? 0}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-bold text-secondary-foreground">
            <Sparkles className="size-4" /> {data?.points ?? 0}
          </span>
        </div>
      </header>

      <div className="mt-5 flex flex-col items-center rounded-4xl border border-border bg-card p-5 shadow-soft">
        <ProgressRing done={progress.done} total={progress.total} />
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {isLoading
            ? "Laddar dagen…"
            : progress.total === 0
              ? "Inget inplanerat idag. Lägg till en liten sak nedan."
              : complete
                ? "Allt klart idag. Du får vila nu. 🌿"
                : `${progress.total - progress.done} kvar – ta en i taget.`}
        </p>

        <div className="mt-4 grid w-full grid-cols-7 gap-1">
          {week.map((d) => {
            const s = summaries.get(d) as any;
            const isToday = d === day;
            const ratio = s && s.tasks_total + s.steps_total > 0 ? (s.tasks_done + s.steps_done) / (s.tasks_total + s.steps_total) : 0;
            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "grid h-9 w-full place-items-center overflow-hidden rounded-xl bg-secondary",
                    isToday && "ring-2 ring-primary",
                  )}
                >
                  <div
                    className={cn("w-full", s?.completed ? "bg-success" : "bg-primary/60")}
                    style={{ height: `${Math.round(ratio * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {WEEKDAY_LABELS[new Date(`${d}T12:00:00`).getDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {(data?.notifications ?? []).length > 0 ? (
        <div className="mt-4 space-y-2">
          {(data?.notifications ?? []).map((n: any) => (
            <div
              key={n.id}
              className="animate-rise grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-accent/50 bg-accent/25 px-3 py-3"
            >
              <Sunrise className="size-5 shrink-0 text-accent-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{n.title}</p>
                {n.body ? <p className="truncate text-xs text-muted-foreground">{n.body}</p> : null}
              </div>
              <button
                type="button"
                aria-label="Stäng"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-card"
                onClick={async () => {
                  await markRead({ data: { id: n.id } });
                  refresh();
                }}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
          placeholder="Lägg till något litet…"
          className="h-14 rounded-2xl text-base"
        />
        <button
          type="button"
          onClick={add}
          aria-label="Lägg till"
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </button>
      </div>

      {routines.length > 0 ? (
        <Section title="Rutiner idag">
          {routines.map((r: any) => {
            const isOpen = open[r.id] ?? r.doneCount < r.steps.length;
            const allDone = r.steps.length > 0 && r.doneCount >= r.steps.length;
            return (
              <div key={r.id} className="overflow-hidden rounded-3xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [r.id]: !isOpen }))}
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-xl">
                    {r.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">{r.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {shortTime(r.window_start)}–{shortTime(r.window_end)} · {r.doneCount}/{r.steps.length} klara
                    </span>
                    <span className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <span
                        className={cn("block h-full rounded-full transition-all", allDone ? "bg-success" : "bg-primary")}
                        style={{ width: `${r.steps.length ? (r.doneCount / r.steps.length) * 100 : 0}%` }}
                      />
                    </span>
                  </span>
                  <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen ? (
                  <div className="space-y-2 px-3 pb-3">
                    {r.steps.map((s: any) => (
                      <CheckRow key={s.id} size="sm" title={s.title} done={s.done} onToggle={() => onToggleStep(r.id, s)} />
                    ))}
                    {r.steps.length === 0 ? (
                      <p className="px-1 pb-2 text-sm text-muted-foreground">Inga steg än – lägg till under Rutiner.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </Section>
      ) : null}

      {nu.length > 0 ? (
        <Section title="Nu">
          {nu.map((t: any) => (
            <CheckRow
              key={t.id}
              title={t.title}
              done={t.done}
              onToggle={() => onToggleTask(t)}
              meta={[shortTime(t.due_time), t.estimate_minutes ? `${t.estimate_minutes} min` : null]
                .filter(Boolean)
                .join(" · ")}
            />
          ))}
        </Section>
      ) : null}

      {senare.length > 0 ? (
        <Section title="Senare idag">
          {senare.map((t: any) => (
            <CheckRow
              key={t.id}
              title={t.title}
              done={t.done}
              onToggle={() => onToggleTask(t)}
              meta={shortTime(t.due_time)}
            />
          ))}
        </Section>
      ) : null}

      {missade.length > 0 ? (
        <Section title="Missat" count={missade.length}>
          {missade.map((t: any) => (
            <CheckRow
              key={t.id}
              tone="missed"
              title={t.title}
              done={false}
              onToggle={() => onToggleTask(t)}
              meta={`Låg kvar från ${t.due_date}`}
              trailing={
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveToToday(t)}
                    className="min-h-10 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
                  >
                    Idag
                  </button>
                  <button
                    type="button"
                    onClick={() => letGo(t)}
                    className="min-h-10 rounded-xl bg-secondary px-3 text-xs font-bold text-secondary-foreground"
                  >
                    Släpp
                  </button>
                </div>
              }
            />
          ))}
        </Section>
      ) : null}

      {klara.length > 0 ? (
        <Section title="Klart" count={klara.length}>
          {klara.map((t: any) => (
            <CheckRow key={t.id} title={t.title} done onToggle={() => onToggleTask(t)} />
          ))}
        </Section>
      ) : null}
    </AppShell>
  );
}
