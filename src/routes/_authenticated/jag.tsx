import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bell, BellOff, Flame, LogOut } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/BottomNav";
import { useDashboard, useRefreshDashboard } from "@/hooks/useDashboard";
import { getSettings, saveProfile, saveSettings } from "@/lib/app.functions";
import { getVapidKey, removePushSubscription, savePushSubscription, sendTestPush } from "@/lib/push.functions";
import { disablePush, enablePush } from "@/lib/push-client";
import { changePin } from "@/lib/pin-auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import appIcon from "@/assets/dagsform-icon.png.asset.json";

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
  const fetchVapid = useServerFn(getVapidKey);
  const saveSubscription = useServerFn(savePushSubscription);
  const removeSubscription = useServerFn(removePushSubscription);
  const testPush = useServerFn(sendTestPush);

  const [name, setName] = useState<string | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function patch(p: Record<string, unknown>) {
    await saveSettingsFn({ data: { patch: p } });
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
  }

  async function askForPush(enabled: boolean) {
    setBusy(true);
    try {
      if (!enabled) {
        const endpoint = await disablePush();
        if (endpoint) await removeSubscription({ data: { endpoint } });
        await patch({ push_enabled: false });
        toast.success("Notiser i telefonen är av");
        return;
      }

      const { publicKey } = await fetchVapid({ data: undefined as never });
      const outcome = await enablePush(publicKey);
      if (outcome.status !== "ok") {
        toast.error(outcome.message);
        return;
      }
      await saveSubscription({
        data: {
          endpoint: outcome.endpoint,
          p256dh: outcome.p256dh,
          auth: outcome.auth,
          label: outcome.label,
        },
      });
      await patch({ push_enabled: true });
      toast.success("Notiser är på – den här enheten är kopplad");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunde inte slå på notiser");
    } finally {
      setBusy(false);
    }
  }

  async function handleTestPush() {
    setBusy(true);
    try {
      const res = (await testPush({ data: undefined as never })) as {
        ok: boolean;
        sent: number;
        error: string | null;
      };
      if (res.ok) toast.success(`Testnotis skickad till ${res.sent} enhet${res.sent === 1 ? "" : "er"}`);
      else toast.error(res.error ?? "Kunde inte skicka testnotisen");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunde inte skicka testnotisen");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3">
        <img src={appIcon.url} alt="Dagsforms profilbild" className="size-14 object-contain" />
        <h1 className="font-display text-2xl text-foreground">Jag</h1>
      </div>

      <div className="mt-4">
        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="flex items-center gap-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            <Flame className="size-4" /> Streak
          </p>
          <p className="mt-1 font-display text-3xl text-foreground">{data?.streak ?? 0}</p>
          <p className="text-xs text-muted-foreground">dagar i rad</p>
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
        <Row label="E-post" hint="Används om du glömmer din PIN-kod">
          <span className="max-w-40 truncate text-sm text-muted-foreground">{data?.profile?.email}</span>
        </Row>
      </section>

      <h2 className="mt-7 px-1 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">Påminnelser</h2>
      <section className="mt-2 rounded-3xl border border-border bg-card px-4 py-1">
        <Row label="Notiser i telefonen" hint="Kommer fram även när appen är stängd">
          <Switch checked={!!s?.push_enabled} onCheckedChange={askForPush} disabled={busy} />
        </Row>
        {s?.push_enabled ? (
          <Row label="Testa notisen" hint="Skickar en notis till dina kopplade enheter">
            <button
              type="button"
              onClick={handleTestPush}
              disabled={busy}
              className="min-h-10 rounded-xl bg-secondary px-3 text-xs font-bold text-secondary-foreground disabled:opacity-50"
            >
              Skicka test
            </button>
          </Row>
        ) : null}
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
        <Row label="Rutinpåminnelser" hint="15 min innan rutinens tidsfönster börjar">
          <Switch checked={!!s?.routine_reminders} onCheckedChange={(v) => patch({ routine_reminders: v })} />
        </Row>
        <Row label="Uppgiftspåminnelser" hint="Notis vid uppgiftens klockslag eller tidsdel">
          <Switch checked={s?.task_reminders !== false} onCheckedChange={(v) => patch({ task_reminders: v })} />
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
          {s?.push_enabled
            ? "Notiser skickas till den här enheten även när appen är stängd. Slå på notiser igen på varje telefon eller dator du vill få dem på."
            : "Slå på notiser för att få påminnelser i telefonen även när appen är stängd. På iPhone måste du först spara Dagsform på hemskärmen."}
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
