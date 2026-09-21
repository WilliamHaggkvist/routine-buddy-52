import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckRow } from "@/components/CheckRow";
import { createTask, deleteTask, toggleTask, updateTask } from "@/lib/app.functions";
import { addDays, humanDate, todayKey, WEEKDAY_LABELS } from "@/lib/day";
import { cn } from "@/lib/utils";

const ESTIMATES = [2, 10, 30];

function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
      )}
    >
      {children}
    </button>
  );
}

type Props = {
  task: any | null;
  lists: { id: string; name: string; emoji: string }[];
  day: string;
  onClose: () => void;
  onChanged: () => void;
};

export function TaskSheet({ task, lists, day, onClose, onChanged }: Props) {
  const updateTaskFn = useServerFn(updateTask);
  const deleteTaskFn = useServerFn(deleteTask);
  const createTaskFn = useServerFn(createTask);
  const toggleTaskFn = useServerFn(toggleTask);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [newStep, setNewStep] = useState("");

  useEffect(() => {
    setTitle(task?.title ?? "");
    setNotes(task?.notes ?? "");
    setNewStep("");
  }, [task?.id]);

  if (!task) return null;

  async function patch(p: Record<string, unknown>) {
    await updateTaskFn({ data: { id: task.id, patch: p, day } });
    onChanged();
  }

  const today = todayKey();
  const recurrenceDays: number[] = task.recurrence_days ?? [];

  return (
    <Sheet open={!!task} onOpenChange={(o) => (!o ? onClose() : null)}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl px-4 pb-8">
        <SheetHeader className="px-0 text-left">
          <SheetTitle className="font-display text-xl">Uppgift</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => (title.trim() && title.trim() !== task.title ? patch({ title: title.trim() }) : null)}
            className="h-14 rounded-2xl text-base"
            placeholder="Vad ska göras?"
          />

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => ((notes ?? "") !== (task.notes ?? "") ? patch({ notes: notes || null }) : null)}
            placeholder="Anteckning (valfritt)"
            className="min-h-20 rounded-2xl text-base"
          />

          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Datum</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              <Chip active={task.due_date === today} onClick={() => patch({ due_date: today })}>
                Idag
              </Chip>
              <Chip active={task.due_date === addDays(today, 1)} onClick={() => patch({ due_date: addDays(today, 1) })}>
                Imorgon
              </Chip>
              <Popover>
                <PopoverTrigger asChild>
                  <Chip active={!!task.due_date && task.due_date !== today && task.due_date !== addDays(today, 1)}>
                    <CalendarDays className="size-4" />
                    {task.due_date && task.due_date !== today && task.due_date !== addDays(today, 1)
                      ? humanDate(task.due_date, today)
                      : "Välj datum"}
                  </Chip>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={task.due_date ? new Date(`${task.due_date}T12:00:00`) : undefined}
                    onSelect={(d) => patch({ due_date: d ? todayKey(d) : null })}
                    className={cn("pointer-events-auto p-3")}
                  />
                </PopoverContent>
              </Popover>
              <Chip active={!task.due_date} onClick={() => patch({ due_date: null })}>
                Inget datum
              </Chip>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Klockslag
              <Input
                type="time"
                defaultValue={task.due_time ? String(task.due_time).slice(0, 5) : ""}
                onBlur={(e) => patch({ due_time: e.target.value || null })}
                className="mt-1 h-12 w-full min-w-0 rounded-xl px-2 text-sm"
              />
            </label>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Hur lång tid</p>
              <div className="mt-1 flex gap-1">
                {ESTIMATES.map((m) => (
                  <Chip
                    key={m}
                    active={task.estimate_minutes === m}
                    onClick={() => patch({ estimate_minutes: task.estimate_minutes === m ? null : m })}
                  >
                    {m}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Lista</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              <Chip active={!task.list_id} onClick={() => patch({ list_id: null })}>
                Inkorg
              </Chip>
              {lists.map((l) => (
                <Chip key={l.id} active={task.list_id === l.id} onClick={() => patch({ list_id: l.id })}>
                  {l.emoji} {l.name}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Återkommer</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={task.recurrence === "none"} onClick={() => patch({ recurrence: "none" })}>
                Nej
              </Chip>
              <Chip active={task.recurrence === "daily"} onClick={() => patch({ recurrence: "daily" })}>
                Varje dag
              </Chip>
              <Chip active={task.recurrence === "weekdays"} onClick={() => patch({ recurrence: "weekdays" })}>
                Vardagar
              </Chip>
              <Chip active={task.recurrence === "weekly"} onClick={() => patch({ recurrence: "weekly" })}>
                Veckodagar
              </Chip>
            </div>
            {task.recurrence === "weekly" ? (
              <div className="mt-2 grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      patch({
                        recurrence_days: recurrenceDays.includes(i)
                          ? recurrenceDays.filter((d) => d !== i)
                          : [...recurrenceDays, i].sort(),
                      })
                    }
                    className={cn(
                      "min-h-10 rounded-xl text-xs font-bold",
                      recurrenceDays.includes(i)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Delsteg</p>
            <div className="space-y-2">
              {(task.children ?? []).map((c: any) => (
                <CheckRow
                  key={c.id}
                  size="sm"
                  title={c.title}
                  done={c.done}
                  onToggle={async () => {
                    await toggleTaskFn({ data: { taskId: c.id, day, done: !c.done } });
                    onChanged();
                  }}
                  trailing={
                    <button
                      type="button"
                      aria-label="Ta bort delsteg"
                      onClick={async () => {
                        await deleteTaskFn({ data: { id: c.id, day } });
                        onChanged();
                      }}
                      className="grid size-10 place-items-center rounded-xl bg-secondary text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  }
                />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key !== "Enter") return;
                  const t = newStep.trim();
                  if (!t) return;
                  setNewStep("");
                  await createTaskFn({ data: { title: t, parentId: task.id, listId: task.list_id ?? null } });
                  onChanged();
                }}
                placeholder="Nytt delsteg"
                className="h-12 rounded-xl"
              />
              <button
                type="button"
                aria-label="Lägg till delsteg"
                onClick={async () => {
                  const t = newStep.trim();
                  if (!t) return;
                  setNewStep("");
                  await createTaskFn({ data: { title: t, parentId: task.id, listId: task.list_id ?? null } });
                  onChanged();
                }}
                className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"
              >
                <Plus className="size-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={async () => {
                await patch({ due_date: today });
                toast.success("Ligger på dagens lista");
                onClose();
              }}
              className="min-h-14 rounded-2xl bg-primary text-sm font-bold text-primary-foreground"
            >
              Flytta till idag
            </button>
            <button
              type="button"
              onClick={async () => {
                await patch({ due_date: addDays(today, 1) });
                toast.success("Flyttad till imorgon");
                onClose();
              }}
              className="min-h-14 rounded-2xl bg-secondary text-sm font-bold text-secondary-foreground"
            >
              Flytta till imorgon
            </button>
            <button
              type="button"
              onClick={async () => {
                await patch({ is_archived: true });
                toast("Släppt – inget dåligt samvete");
                onClose();
              }}
              className="min-h-14 rounded-2xl bg-warm text-sm font-bold text-warm-foreground"
            >
              Släpp den
            </button>
            <button
              type="button"
              onClick={async () => {
                await deleteTaskFn({ data: { id: task.id, day } });
                onChanged();
                toast("Borttagen");
                onClose();
              }}
              className="min-h-14 rounded-2xl bg-secondary text-sm font-bold text-destructive"
            >
              Ta bort
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
