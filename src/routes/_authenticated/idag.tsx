import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Flame, Sunrise, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/BottomNav";
import { LocalReminders } from "@/components/LocalReminders";
import { CheckRow } from "@/components/CheckRow";
import { ProgressRing } from "@/components/ProgressRing";
import { TaskComposer } from "@/components/TaskComposer";
import { TaskSheet } from "@/components/TaskSheet";
import { useDashboard, useRefreshDashboard } from "@/hooks/useDashboard";
import { createTask, getSettings, markNudgeRead, pushNudge, toggleStep, toggleTask, updateTask } from "@/lib/app.functions";
import { currentWeekDays, greeting, humanDate, isSoon, priorityLabel, shortTime, taskTime, taskTimeLabel, WEEKDAY_LABELS_MON_SUN } from "@/lib/day";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/idag")({
  head: () => ({
    meta: [
      { title: "Idag – Dagsform" },
      { name: "description", content: "Dagens rutiner och uppgifter i tidsordning, med visuell progress och streak." },
      { property: "og:title", content: "Idag – Dagsform" },
      { property: "og:description", content: "Dagens rutiner och uppgifter i tidsordning." },
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

type Item =
  | { kind: "task"; time: string | null; task: any }
  | { kind: "routine"; time: string | null; routine: any };

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

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const week = useMemo(() => currentWeekDays(), []);
  const summaries = new Map((data?.summaries ?? []).map((s: any) => [s.day, s]));

  const tasks = data?.tasks ?? [];
  const lists = data?.lists ?? [];
  const todayTasks = tasks.filter((t: any) => t.bucket === "today");
  const missade = tasks.filter((t: any) => t.bucket === "missed");
  const routines = (data?.routines ?? []).filter((r: any) => r.activeToday);
  const sheetTask = tasks.find((t: any) => t.id === sheetId) ?? null;

  const timed: Item[] = [
    ...todayTasks
      .filter((t: any) => !t.done && taskTime(t))
      .map((t: any) => ({ kind: "task" as const, time: taskTime(t), task: t })),
    ...routines
      .filter((r: any) => !(r.steps.length > 0 && r.doneCount >= r.steps.length))
      .map((r: any) => ({ kind: "routine" as const, time: shortTime(r.window_start), routine: r })),
  ].sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));

  const nu = timed.filter((i) => isSoon(i.time));
  const senare = timed.filter((i) => !isSoon(i.time));
  const nagon_gang = todayTasks.filter((t: any) => !t.done && !taskTime(t));
  const klaraTasks = todayTasks.filter((t: any) => t.done);
  const klaraRoutines = routines.filter((r: any) => r.steps.length > 0 && r.doneCount >= r.steps.length);

  async function onToggleTask(t: any) {
    await toggleTaskFn({ data: { taskId: t.id, day, done: !t.done } });
    if (!t.done) toast.success("Snyggt! ✦");
    refresh();
  }

  async function onToggleStep(routineId: string, s: any) {
    await toggleStepFn({ data: { stepId: s.id, routineId, day, done: !s.done } });
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

  function taskMeta(t: any) {
    return [taskTimeLabel(t), priorityLabel(t.priority)]
      .filter(Boolean)
      .join(" · ");
  }


  function RoutineCard({ r }: { r: any }) {
    const isOpen = open[r.id] ?? r.doneCount < r.steps.length;
    const allDone = r.steps.length > 0 && r.doneCount >= r.steps.length;
    return (
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setOpen((o) => ({ ...o, [r.id]: !isOpen }))}
          className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-xl">{r.emoji}</span>
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
          <ChevronDown
            className={cn("size-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
          />
        </button>
        {isOpen ? (
          <div className="space-y-2 px-3 pb-3">
            {r.steps.map((st: any) => (
              <CheckRow key={st.id} size="sm" title={st.title} done={st.done} onToggle={() => onToggleStep(r.id, st)} />
            ))}
            {r.steps.length === 0 ? (
              <p className="px-1 pb-2 text-sm text-muted-foreground">Inga steg än – lägg till under Rutiner.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderItem(i: Item) {
    if (i.kind === "routine") return <RoutineCard key={`r-${i.routine.id}`} r={i.routine} />;
    const t = i.task;
    return (
      <CheckRow
        key={`t-${t.id}`}
        title={t.title}
        done={t.done}
        onToggle={() => onToggleTask(t)}
        onOpen={() => setSheetId(t.id)}
        meta={taskMeta(t)}
      />
    );
  }

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
          {week.map((d, i) => {
            const sum = summaries.get(d) as any;
            const isToday = d === day;
            const ratio =
              sum && sum.tasks_total + sum.steps_total > 0
                ? (sum.tasks_done + sum.steps_done) / (sum.tasks_total + sum.steps_total)
                : 0;
            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "grid h-9 w-full place-items-center overflow-hidden rounded-xl bg-secondary",
                    isToday && "ring-2 ring-primary",
                  )}
                >
                  <div
                    className={cn("w-full", sum?.completed ? "bg-success" : "bg-primary/60")}
                    style={{ height: `${Math.round(ratio * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {WEEKDAY_LABELS_MON_SUN[i]}
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

      <div className="mt-5">
        <TaskComposer
          lists={lists}
          defaultDay={null}
          placeholder="Lägg till något litet…"
          onCreate={async (input) => {
            await createTaskFn({
              data: {
                title: input.title,
                day: input.day,
                dueTime: input.dueTime,
                timeBand: input.timeBand,
                listId: input.listId,
                priority: input.priority,
              },
            });

            refresh();
          }}
        />
      </div>

      {nu.length > 0 ? <Section title="Nu">{nu.map(renderItem)}</Section> : null}

      {senare.length > 0 ? <Section title="Senare idag">{senare.map(renderItem)}</Section> : null}

      {nagon_gang.length > 0 ? (
        <Section title="När som helst idag">
          {nagon_gang.map((t: any) => (
            <CheckRow
              key={t.id}
              title={t.title}
              done={t.done}
              onToggle={() => onToggleTask(t)}
              onOpen={() => setSheetId(t.id)}
              meta={taskMeta(t)}
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
              onOpen={() => setSheetId(t.id)}
              meta={`Låg kvar från ${humanDate(t.due_date, day)}`}
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

      {klaraTasks.length + klaraRoutines.length > 0 ? (
        <section className="mt-6">
          <button
            type="button"
            onClick={() => setShowDone(!showDone)}
            className="flex min-h-11 w-full items-center justify-between px-1"
          >
            <span className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
              Klart idag ({klaraTasks.length + klaraRoutines.length})
            </span>
            <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", showDone && "rotate-180")} />
          </button>
          {showDone ? (
            <div className="mt-2 space-y-2">
              {klaraRoutines.map((r: any) => (
                <RoutineCard key={r.id} r={r} />
              ))}
              {klaraTasks.map((t: any) => (
                <CheckRow key={t.id} title={t.title} done onToggle={() => onToggleTask(t)} onOpen={() => setSheetId(t.id)} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <TaskSheet
        task={sheetTask}
        lists={lists}
        day={day}
        onClose={() => setSheetId(null)}
        onChanged={refresh}
      />
    </AppShell>
  );
}
