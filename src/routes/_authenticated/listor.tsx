import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/BottomNav";
import { CheckRow } from "@/components/CheckRow";
import { useDashboard, useRefreshDashboard } from "@/hooks/useDashboard";
import { createTask, deleteList, deleteTask, saveList, toggleTask, updateTask } from "@/lib/app.functions";
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

const ESTIMATES = [2, 10, 30];

function ListsPage() {
  const { data, day } = useDashboard();
  const refresh = useRefreshDashboard();
  const createTaskFn = useServerFn(createTask);
  const updateTaskFn = useServerFn(updateTask);
  const deleteTaskFn = useServerFn(deleteTask);
  const toggleTaskFn = useServerFn(toggleTask);
  const saveListFn = useServerFn(saveList);
  const deleteListFn = useServerFn(deleteList);

  const [active, setActive] = useState<string | "alla">("alla");
  const [newList, setNewList] = useState("");
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState<number | null>(null);

  const lists = data?.lists ?? [];
  const tasks = (data?.tasks ?? []).filter((t: any) => !t.done || t.bucket === "today");
  const visible = tasks.filter((t: any) => {
    if (active !== "alla" && t.list_id !== active) return false;
    if (filter && (t.estimate_minutes ?? 999) > filter) return false;
    return true;
  });

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
        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase self-center">Orkar:</span>
        {ESTIMATES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setFilter(filter === m ? null : m)}
            className={cn(
              "min-h-10 rounded-xl px-3 text-xs font-bold",
              filter === m ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground",
            )}
          >
            ≤ {m} min
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key !== "Enter") return;
            const title = newTask.trim();
            if (!title) return;
            setNewTask("");
            await createTaskFn({ data: { title, listId: active === "alla" ? null : active } });
            refresh();
          }}
          placeholder="Ny uppgift i listan"
          className="h-14 rounded-2xl text-base"
        />
        <button
          type="button"
          aria-label="Lägg till uppgift"
          onClick={async () => {
            const title = newTask.trim();
            if (!title) return;
            setNewTask("");
            await createTaskFn({ data: { title, listId: active === "alla" ? null : active } });
            refresh();
          }}
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </button>
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
            meta={[
              t.due_date ? (t.due_date === day ? "Idag" : t.due_date) : null,
              t.recurrence !== "none" ? "Återkommer" : null,
              t.estimate_minutes ? `${t.estimate_minutes} min` : null,
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
        <h2 className="text-sm font-bold text-foreground">Dina listor</h2>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Input
            value={newList}
            onChange={(e) => setNewList(e.target.value)}
            placeholder="Ny lista"
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
              <span className="truncate text-sm text-foreground">
                {l.emoji} {l.name}
              </span>
              <button
                type="button"
                aria-label={`Ta bort ${l.name}`}
                onClick={async () => {
                  await deleteListFn({ data: { id: l.id } });
                  refresh();
                }}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
