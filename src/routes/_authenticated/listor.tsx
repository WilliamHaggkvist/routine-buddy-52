import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/BottomNav";
import { CheckRow } from "@/components/CheckRow";
import { TaskComposer } from "@/components/TaskComposer";
import { TaskSheet } from "@/components/TaskSheet";
import { useDashboard, useRefreshDashboard } from "@/hooks/useDashboard";
import { createTask, deleteList, deleteTask, saveList, toggleTask, updateTask } from "@/lib/app.functions";
import { humanDate, priorityLabel, PRIORITIES, shortTime } from "@/lib/day";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/listor")({
  head: () => ({
    meta: [
      { title: "Listor – Dagsform" },
      { name: "description", content: "Samla uppgifter i egna listor och plocka in dem i dagen när du orkar." },
      { property: "og:title", content: "Listor – Dagsform" },
      { property: "og:description", content: "Egna listor för allt som inte måste göras idag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListsPage,
});


function ListsPage() {
  const { data, day } = useDashboard();
  const refresh = useRefreshDashboard();
  const createTaskFn = useServerFn(createTask);
  const updateTaskFn = useServerFn(updateTask);
  const deleteTaskFn = useServerFn(deleteTask);
  const toggleTaskFn = useServerFn(toggleTask);
  const saveListFn = useServerFn(saveList);
  const deleteListFn = useServerFn(deleteList);

  const [active, setActive] = useState<string | "alla" | "inkorg">("alla");
  const [newList, setNewList] = useState("");
  const [filter, setFilter] = useState<number | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);

  const lists = data?.lists ?? [];
  const tasks = (data?.tasks ?? []).filter((t: any) => !t.parent_id && (!t.done || t.bucket === "today"));
  const sheetTask = (data?.tasks ?? []).find((t: any) => t.id === sheetId) ?? null;

  const visible = tasks
    .filter((t: any) => {
      if (active === "inkorg" && t.list_id) return false;
      if (active !== "alla" && active !== "inkorg" && t.list_id !== active) return false;
      if (filter && t.priority !== filter) return false;
      return true;
    })
    .slice()
    .sort(
      (a: any, b: any) =>
        (a.priority ?? 9) - (b.priority ?? 9) ||
        `${a.due_date ?? "9999"}${a.due_time ?? ""}`.localeCompare(`${b.due_date ?? "9999"}${b.due_time ?? ""}`),
    );


  return (
    <AppShell>
      <h1 className="font-display text-2xl text-foreground">Listor</h1>
      <p className="mt-1 text-sm text-muted-foreground">Allt som inte behöver ligga på dagens lista.</p>

      <div className="mt-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          onClick={() => setActive("alla")}
          className={cn(
            "min-h-11 shrink-0 rounded-2xl px-4 text-sm font-bold",
            active === "alla" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
          )}
        >
          Allt
        </button>
        <button
          type="button"
          onClick={() => setActive("inkorg")}
          className={cn(
            "min-h-11 shrink-0 rounded-2xl px-4 text-sm font-bold",
            active === "inkorg" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
          )}
        >
          📥 Inkorg
        </button>
        {lists.map((l: any) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setActive(l.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-2xl px-4 text-sm font-bold",
              active === l.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
            )}
          >
            {l.emoji} {l.name}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <span className="self-center text-xs font-bold tracking-wide text-muted-foreground uppercase">Prio:</span>
        {PRIORITIES.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setFilter(filter === p.value ? null : p.value)}
            className={cn(
              "min-h-10 rounded-xl px-3 text-xs font-bold",
              filter === p.value ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>


      <div className="mt-4">
        <TaskComposer
          lists={lists}
          defaultDay={null}
          defaultListId={active === "alla" || active === "inkorg" ? null : active}
          placeholder="Ny uppgift i listan"
          onCreate={async (input) => {
            await createTaskFn({
              data: {
                title: input.title,
                day: input.day,
                dueTime: input.dueTime,
                listId: input.listId,
                priority: input.priority,
              },
            });

            refresh();
          }}
        />
      </div>

      <div className="mt-4 space-y-2">
        {visible.map((t: any) => (
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
              priorityLabel(t.priority),
              humanDate(t.due_date, day),
              shortTime(t.due_time),
              active === "alla" ? (lists.find((l: any) => l.id === t.list_id)?.name ?? "Inkorg") : null,
            ]
              .filter(Boolean)
              .join(" · ")}

            trailing={
              <div className="flex gap-1">
                {t.due_date === day ? null : (
                  <button
                    type="button"
                    onClick={async () => {
                      await updateTaskFn({ data: { id: t.id, patch: { due_date: day }, day } });
                      toast.success("Ligger på dagens lista");
                      refresh();
                    }}
                    className="min-h-10 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
                  >
                    Idag
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Ta bort"
                  onClick={async () => {
                    await deleteTaskFn({ data: { id: t.id, day } });
                    refresh();
                  }}
                  className="grid size-10 place-items-center rounded-xl bg-secondary text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            }
          />
        ))}
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Tomt här. Skönt.
          </p>
        ) : null}
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-card p-4">
        <h2 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Mina listor</h2>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Input
            value={newList}
            onChange={(e) => setNewList(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key !== "Enter") return;
              const name = newList.trim();
              if (!name) return;
              setNewList("");
              await saveListFn({ data: { name } });
              refresh();
            }}
            placeholder="Ny lista, t.ex. Handla"
            className="h-12 rounded-xl"
          />
          <button
            type="button"
            aria-label="Skapa lista"
            onClick={async () => {
              const name = newList.trim();
              if (!name) return;
              setNewList("");
              await saveListFn({ data: { name } });
              refresh();
            }}
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"
          >
            <Plus className="size-5" />
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {lists.map((l: any) => (
            <div key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {l.emoji} {l.name}
              </span>
              <button
                type="button"
                aria-label={`Ta bort listan ${l.name}`}
                onClick={async () => {
                  await deleteListFn({ data: { id: l.id } });
                  toast("Listan är borta – uppgifterna ligger kvar i Inkorg");
                  refresh();
                }}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {lists.length === 0 ? <p className="text-sm text-muted-foreground">Du har inga listor än.</p> : null}
        </div>
      </div>

      <TaskSheet task={sheetTask} lists={lists} day={day} onClose={() => setSheetId(null)} onChanged={refresh} />
    </AppShell>
  );
}
