import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AppShell } from "@/components/BottomNav";
import { CheckRow } from "@/components/CheckRow";
import { TaskComposer } from "@/components/TaskComposer";
import { TaskSheet } from "@/components/TaskSheet";
import { useDashboard, useRefreshDashboard } from "@/hooks/useDashboard";
import { createTask, toggleTask, updateTask } from "@/lib/app.functions";
import { addDays, humanDate, priorityLabel, taskTime, taskTimeLabel } from "@/lib/day";

export const Route = createFileRoute("/_authenticated/planerat")({
  head: () => ({
    meta: [
      { title: "Planerat – Dagsform" },
      { name: "description", content: "Se vad som ligger imorgon, senare i veckan och längre fram – och flytta det till idag." },
      { property: "og:title", content: "Planerat – Dagsform" },
      { property: "og:description", content: "Kommande dagar och uppgifter utan datum, samlade på ett ställe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlannedPage,
});

function PlannedPage() {
  const { data, day } = useDashboard();
  const refresh = useRefreshDashboard();
  const createTaskFn = useServerFn(createTask);
  const updateTaskFn = useServerFn(updateTask);
  const toggleTaskFn = useServerFn(toggleTask);

  const [sheetId, setSheetId] = useState<string | null>(null);

  const tasks = (data?.tasks ?? []).filter((t: any) => !t.parent_id);
  const lists = data?.lists ?? [];
  const sheetTask = tasks.find((t: any) => t.id === sheetId) ?? null;

  const tomorrow = addDays(day, 1);
  const weekEnd = addDays(day, 7);

  const forsenade = tasks.filter((t: any) => t.due_date && t.due_date < day && !t.done);
  const imorgon = tasks.filter((t: any) => t.due_date === tomorrow && !t.done);
  const veckan = tasks.filter((t: any) => t.due_date && t.due_date > tomorrow && t.due_date <= weekEnd && !t.done);
  const senare = tasks.filter((t: any) => t.due_date && t.due_date > weekEnd && !t.done);
  const utanDatum = tasks.filter((t: any) => !t.due_date && !t.done);

  async function moveToToday(t: any) {
    await updateTaskFn({ data: { id: t.id, patch: { due_date: day }, day } });
    toast.success("Ligger på dagens lista");
    refresh();
  }

  function Group({ title, items }: { title: string; items: any[] }) {
    if (items.length === 0) return null;
    return (
      <section className="mt-6">
        <h2 className="mb-2 px-1 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
          {title} ({items.length})
        </h2>
        <div className="space-y-2">
          {items
            .slice()
            .sort((a, b) => `${a.due_date ?? ""}${taskTime(a) ?? "99:99"}`.localeCompare(`${b.due_date ?? ""}${taskTime(b) ?? "99:99"}`))
            .map((t: any) => (
              <CheckRow
                key={t.id}
                title={t.title}
                done={t.done}
                onToggle={async () => {
                  await toggleTaskFn({ data: { taskId: t.id, day, done: !t.done } });
                  refresh();
                }}
                onOpen={() => setSheetId(t.id)}
                meta={[
                  humanDate(t.due_date, day),
                  taskTimeLabel(t),
                  priorityLabel(t.priority),
                  lists.find((l: any) => l.id === t.list_id)?.name ?? null,
                ]
                  .filter(Boolean)
                  .join(" · ")}

                trailing={
                  <button
                    type="button"
                    onClick={() => moveToToday(t)}
                    className="min-h-10 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
                  >
                    Idag
                  </button>
                }
              />
            ))}
        </div>
      </section>
    );
  }

  const inget = forsenade.length + imorgon.length + veckan.length + senare.length + utanDatum.length === 0;

  return (
    <AppShell>
      <h1 className="font-display text-2xl text-foreground">Planerat</h1>
      <p className="mt-1 text-sm text-muted-foreground">Det som ligger framåt – flytta in i dagen när du orkar.</p>

      <div className="mt-4">
        <TaskComposer
          lists={lists}
          defaultDay={null}
          placeholder="Ny uppgift framåt…"
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

      {forsenade.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-destructive/30 bg-destructive/5 p-3">
          <h2 className="mb-2 px-1 text-xs font-bold tracking-[0.12em] text-destructive uppercase">
            Försenat ({forsenade.length})
          </h2>
          <div className="space-y-2">
            {forsenade
              .slice()
              .sort((a, b) => `${a.due_date}${taskTime(a) ?? "99:99"}`.localeCompare(`${b.due_date}${taskTime(b) ?? "99:99"}`))
              .map((t: any) => (
                <CheckRow
                  key={t.id}
                  tone="missed"
                  title={t.title}
                  done={false}
                  onToggle={async () => {
                    await toggleTaskFn({ data: { taskId: t.id, day, done: true } });
                    refresh();
                  }}
                  onOpen={() => setSheetId(t.id)}
                  meta={`Låg kvar från ${humanDate(t.due_date, day)}`}
                  trailing={
                    <button
                      type="button"
                      onClick={() => moveToToday(t)}
                      className="min-h-10 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
                    >
                      Idag
                    </button>
                  }
                />
              ))}
          </div>
        </section>
      ) : null}

      <Group title="Imorgon" items={imorgon} />
      <Group title="Denna vecka" items={veckan} />
      <Group title="Senare" items={senare} />
      <Group title="Utan datum" items={utanDatum} />

      {inget ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Inget planerat framåt. Skönt.
        </p>
      ) : null}

      <TaskSheet task={sheetTask} lists={lists} day={day} onClose={() => setSheetId(null)} onChanged={refresh} />
    </AppShell>
  );
}
