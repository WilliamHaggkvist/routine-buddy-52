import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bell, BellOff, Flame, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/BottomNav";
import { useDashboard, useRefreshDashboard } from "@/hooks/useDashboard";
import { getSettings, saveProfile, saveSettings } from "@/lib/app.functions";
import { changePin } from "@/lib/pin-auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/jag")({
  head: () => ({
    meta: [
      { title: "Jag – Dagsform" },
      { name: "description", content: "Ställ in påminnelser, ton, tysta timmar och din PIN-kod." },
      { property: "og:title", content: "Jag – Dagsform" },
      { property: "og:description", content: "Påminnelser, ton, tysta timmar och PIN-kod." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MePage,
});

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-foreground">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function MePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useDashboard();
  const refresh = useRefreshDashboard();
  const fetchSettings = useServerFn(getSettings);
  const saveSettingsFn = useServerFn(saveSettings);
  const saveProfileFn = useServerFn(saveProfile);
  const changePinFn = useServerFn(changePin);

  const settings = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings({ data: undefined as never }) });
  const s = settings.data as any;

  const [name, setName] = useState<string | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");

  async function patch(p: Record<string, unknown>) {
    await saveSettingsFn({ data: { patch: p } });
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
  }

  async function askForPush(enabled: boolean) {
    if (!enabled) return patch({ push_enabled: false });
    if (typeof Notification === "undefined") {
      toast.error("Den här webbläsaren stöder inte notiser");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast.error("Notiser är blockerade i telefonens inställningar");
      return;
    }
    await patch({ push_enabled: true });
    new Notification("Notiser är på ✦", { body: "Du får påminnelser härifrån nu." });
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <h1 className="font-display text-2xl text-foreground">Jag</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="flex items-center gap-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            <Flame className="size-4" /> Streak
          </p>
          <p className="mt-1 font-display text-3xl text-foreground">{data?.streak ?? 0}</p>
          <p className="text-xs text-muted-foreground">dagar i rad</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="flex items-center gap-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            <Sparkles className="size-4" /> Poäng
          </p>
          <p className="mt-1 font-display text-3xl text-foreground">{data?.points ?? 0}</p>
          <p className="text-xs text-muted-foreground">totalt</p>
        </div>
      </div>

      <section className="mt-5 rounded-3xl border border-border bg-card px-4 py-1">
        <Row label="Namn">
          <Input
            value={name ?? data?.profile?.display_name ?? ""}
            onChange={(e) => setName(e.target.value)}
            onBlur={async (e) => {
              if (!e.target.value.trim()) return;
              await saveProfileFn({ data: { displayName: e.target.value.trim() } });
              toast.success("Sparat");
              refresh();
            }}
            className="h-12 w-40 rounded-xl"
          />
        </Row>
        <Row label="E-post" hint="Används för påminnelser via mail">
          <span className="max-w-40 truncate text-sm text-muted-foreground">{data?.profile?.email}</span>
        </Row>
      </section>

      <h2 className="mt-7 px-1 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">Påminnelser</h2>
      <section className="mt-2 rounded-3xl border border-border bg-card px-4 py-1">
        <Row label="Notiser i telefonen" hint="Fungerar bäst om du sparar sidan på hemskärmen">
          <Switch checked={!!s?.push_enabled} onCheckedChange={askForPush} />
        </Row>
        <Row label="Påminnelser via e-post" hint="Morgonöversikt och kvällskoll i mailen">
          <Switch checked={!!s?.email_enabled} onCheckedChange={(v) => patch({ email_enabled: v })} />
        </Row>
        <Row label="Nudgar inne i appen" hint="Mjuka puffar när något ligger orört">
          <Switch checked={!!s?.inapp_enabled} onCheckedChange={(v) => patch({ inapp_enabled: v })} />
        </Row>
        <Row label="Morgonöversikt">
          <div className="flex items-center gap-2">
            <Input
              type="time"
              defaultValue={(s?.morning_time ?? "08:00").slice(0, 5)}
              onBlur={(e) => patch({ morning_time: e.target.value })}
              className="h-12 w-28 rounded-xl"
            />
            <Switch checked={!!s?.morning_enabled} onCheckedChange={(v) => patch({ morning_enabled: v })} />
          </div>
        </Row>
        <Row label="Kvällskoll">
          <div className="flex items-center gap-2">
            <Input
              type="time"
              defaultValue={(s?.evening_time ?? "20:30").slice(0, 5)}
              onBlur={(e) => patch({ evening_time: e.target.value })}
              className="h-12 w-28 rounded-xl"
            />
            <Switch checked={!!s?.evening_enabled} onCheckedChange={(v) => patch({ evening_enabled: v })} />
          </div>
        </Row>
        <Row label="Rutinpåminnelser" hint="När ett tidsfönster snart stänger">
          <Switch checked={!!s?.routine_reminders} onCheckedChange={(v) => patch({ routine_reminders: v })} />
        </Row>
        <Row label="Missat-puffar">
          <Switch checked={!!s?.missed_nudges} onCheckedChange={(v) => patch({ missed_nudges: v })} />
        </Row>
        <Row label="Tysta timmar" hint="Inga notiser mellan dessa tider">
          <div className="flex items-center gap-1">
            <Input
              type="time"
              defaultValue={(s?.quiet_start ?? "22:30").slice(0, 5)}
              onBlur={(e) => patch({ quiet_start: e.target.value })}
              className="h-12 w-24 rounded-xl"
            />
            <Input
              type="time"
              defaultValue={(s?.quiet_end ?? "07:00").slice(0, 5)}
              onBlur={(e) => patch({ quiet_end: e.target.value })}
              className="h-12 w-24 rounded-xl"
            />
          </div>
        </Row>
        <Row label="Ton">
          <div className="flex gap-1">
            {[
              { id: "varm", label: "Varm" },
              { id: "peppig", label: "Peppig" },
              { id: "rakt", label: "Rakt" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => patch({ tone: t.id })}
                className={cn(
                  "min-h-10 rounded-xl px-3 text-xs font-bold",
                  (s?.tone ?? "varm") === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Row>
      </section>

      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-warm/50 px-4 py-3 text-xs text-warm-foreground">
        {s?.push_enabled ? <Bell className="mt-0.5 size-4 shrink-0" /> : <BellOff className="mt-0.5 size-4 shrink-0" />}
        <p>
          Notiser skickas medan Dagsform är öppen eller sparad på hemskärmen. Vill du ha dem även när appen är helt
          stängd, och mail som kommer säkert, säg till – då kopplar vi på utskick i bakgrunden.
        </p>
      </div>

      <h2 className="mt-7 px-1 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">PIN-kod</h2>
      <section className="mt-2 rounded-3xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-2">
          <Input
            inputMode="numeric"
            maxLength={4}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Nuvarande"
            className="h-12 rounded-xl text-center tracking-[0.4em]"
          />
          <Input
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Ny"
            className="h-12 rounded-xl text-center tracking-[0.4em]"
          />
        </div>
        <button
          type="button"
          disabled={currentPin.length !== 4 || newPin.length !== 4}
          onClick={async () => {
            try {
              await changePinFn({ data: { currentPin, newPin } });
              setCurrentPin("");
              setNewPin("");
              toast.success("PIN-koden är bytt");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Kunde inte byta PIN-kod");
            }
          }}
          className="mt-3 min-h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          Byt PIN-kod
        </button>
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-bold text-foreground"
      >
        <LogOut className="size-4" /> Logga ut
      </button>
    </AppShell>
  );
}
