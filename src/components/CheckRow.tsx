import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  done: boolean;
  onToggle: () => void;
  meta?: string | null;
  size?: "md" | "sm";
  trailing?: React.ReactNode;
  tone?: "default" | "missed";
};

export function CheckRow({ title, done, onToggle, meta, size = "md", trailing, tone = "default" }: Props) {
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card px-3 transition-colors",
        size === "md" ? "min-h-16 py-2" : "min-h-14 py-1.5",
        tone === "missed" ? "border-warm bg-warm/40" : "border-border",
        done && "bg-secondary/60",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? `Ångra ${title}` : `Bocka av ${title}`}
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-95",
          done ? "animate-pop border-success bg-success text-success-foreground" : "border-primary/35 bg-background",
        )}
      >
        {done ? <Check className="size-6" strokeWidth={3} /> : null}
      </button>
      <button type="button" onClick={onToggle} className="min-w-0 py-2 text-left">
        <span
          className={cn(
            "block truncate font-medium",
            size === "md" ? "text-[17px]" : "text-[15px]",
            done ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {title}
        </span>
        {meta ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{meta}</span> : null}
      </button>
      <div className="shrink-0">{trailing}</div>
    </div>
  );
}
