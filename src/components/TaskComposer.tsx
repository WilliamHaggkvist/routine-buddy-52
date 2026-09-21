import { useState } from "react";
import { CalendarDays, Clock, Flag, Plus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, humanDate, PRIORITIES, todayKey } from "@/lib/day";
import { cn } from "@/lib/utils";

export type NewTaskInput = {
  title: string;
  day: string | null;
  dueTime: string | null;
  listId: string | null;
  priority: number | null;
};

type Props = {
  lists: { id: string; name: string; emoji: string }[];
  /** Förvalt datum, null = utan datum */
  defaultDay?: string | null;
  defaultListId?: string | null;
  placeholder?: string;
  onCreate: (input: NewTaskInput) => Promise<void> | void;
};

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
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

export function TaskComposer({ lists, defaultDay = null, defaultListId = null, placeholder, onCreate }: Props) {
  const today = todayKey();
  const [title, setTitle] = useState("");
  const [day, setDay] = useState<string | null>(defaultDay);
  const [dueTime, setDueTime] = useState<string | null>(null);
  const [listId, setListId] = useState<string | null>(defaultListId);
  const [priority, setPriority] = useState<number | null>(null);
  const [showMore, setShowMore] = useState(false);

  const open = title.trim().length > 0;

  async function submit() {
    const t = title.trim();
    if (!t) return;
    setTitle("");
    setShowMore(false);
    const payload: NewTaskInput = { title: t, day, dueTime, listId, priority };
    setDueTime(null);
    setPriority(null);
    setDay(defaultDay);
    setListId(defaultListId);
    await onCreate(payload);
  }

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          placeholder={placeholder ?? "Lägg till något litet…"}
          className="h-14 rounded-2xl text-base"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Lägg till uppgift"
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </button>
      </div>

      {open ? (
        <div className="animate-rise mt-2 space-y-2">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Chip active={day === today} onClick={() => setDay(day === today ? null : today)}>
              Idag
            </Chip>
            <Chip
              active={day === addDays(today, 1)}
              onClick={() => setDay(day === addDays(today, 1) ? null : addDays(today, 1))}
            >
              Imorgon
            </Chip>
            <Popover>
              <PopoverTrigger asChild>
                <Chip active={!!day && day !== today && day !== addDays(today, 1)}>
                  <CalendarDays className="size-4" />
                  {day && day !== today && day !== addDays(today, 1) ? humanDate(day, today) : "Datum"}
                </Chip>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={day ? new Date(`${day}T12:00:00`) : undefined}
                  onSelect={(d) => setDay(d ? todayKey(d) : null)}
                  className={cn("pointer-events-auto p-3")}
                />
              </PopoverContent>
            </Popover>
            <label
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold",
                dueTime ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              )}
            >
              <Clock className="size-4" />
              <input
                type="time"
                value={dueTime ?? ""}
                onChange={(e) => setDueTime(e.target.value || null)}
                className="w-[74px] bg-transparent text-xs font-bold outline-none"
                aria-label="Klockslag"
              />
            </label>
            <Chip active={showMore} onClick={() => setShowMore(!showMore)}>
              Mer
            </Chip>
          </div>

          {showMore ? (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <Flag className="size-4" /> Prio
              </p>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <Chip
                    key={p.value}
                    active={priority === p.value}
                    onClick={() => setPriority(priority === p.value ? null : p.value)}
                  >
                    {p.label}
                  </Chip>
                ))}
              </div>

              {lists.length > 0 ? (
                <>
                  <p className="pt-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Lista</p>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    <Chip active={listId === null} onClick={() => setListId(null)}>
                      Inkorg
                    </Chip>
                    {lists.map((l) => (
                      <Chip key={l.id} active={listId === l.id} onClick={() => setListId(l.id)}>
                        {l.emoji} {l.name}
                      </Chip>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
