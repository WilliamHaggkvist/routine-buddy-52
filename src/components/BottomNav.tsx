import { Link } from "@tanstack/react-router";
import { CalendarCheck, CalendarClock, ListTodo, Repeat, User } from "lucide-react";

const items = [
  { to: "/idag", label: "Idag", icon: CalendarCheck },
  { to: "/planerat", label: "Planerat", icon: CalendarClock },
  { to: "/rutiner", label: "Rutiner", icon: Repeat },
  { to: "/listor", label: "Listor", icon: ListTodo },
  { to: "/jag", label: "Jag", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-0.5 text-muted-foreground transition-colors"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="size-6 shrink-0" strokeWidth={2} />
            <span className="text-[10px] font-semibold">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-md px-4 pt-6">{children}</div>
      <BottomNav />
    </div>
  );
}
