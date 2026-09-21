import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Delete, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { registerWithPin, signInWithPin } from "@/lib/pin-auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Lås upp Dagsform" },
      { name: "description", content: "Logga in i Dagsform med din fyrsiffriga PIN-kod." },
      { property: "og:title", content: "Lås upp Dagsform" },
      { property: "og:description", content: "Logga in med din fyrsiffriga PIN-kod." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

const EMAIL_KEY = "dagsform.email";

function Keypad({ onDigit, onBack, disabled }: { onDigit: (d: string) => void; onBack: () => void; disabled?: boolean }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((k, i) =>
        k === "" ? (
          <div key={i} />
        ) : (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => (k === "back" ? onBack() : onDigit(k))}
            className={cn(
              "grid h-16 place-items-center rounded-2xl border border-border bg-card text-2xl font-semibold text-foreground transition-transform active:scale-95 disabled:opacity-50",
              k === "back" && "bg-secondary",
            )}
          >
            {k === "back" ? <Delete className="size-6" /> : k}
          </button>
        ),
      )}
    </div>
  );
}

function Dots({ length }: { length: number }) {
  return (
    <div className="flex justify-center gap-4">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "size-4 rounded-full transition-all",
            i < length ? "scale-110 bg-primary" : "bg-secondary",
          )}
        />
      ))}
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const register = useServerFn(registerWithPin);
  const signIn = useServerFn(signInWithPin);

  const [mode, setMode] = useState<"unlock" | "setup">("unlock");
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(EMAIL_KEY);
    setSavedEmail(stored);
    if (!stored) setMode("setup");
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/idag", replace: true });
    });
  }, [navigate]);

  async function applySession(tokens: { access_token: string; refresh_token: string }, mail: string) {
    const { error } = await supabase.auth.setSession(tokens);
    if (error) throw new Error("Kunde inte starta sessionen");
    localStorage.setItem(EMAIL_KEY, mail);
    navigate({ to: "/idag", replace: true });
  }

  async function handleUnlock(code: string) {
    const mail = savedEmail ?? email;
    if (!mail) {
      setMode("setup");
      return;
    }
    setBusy(true);
    try {
      const res = await signIn({ data: { email: mail, pin: code } });
      await applySession(res, res.email);
    } catch (e) {
      setPin("");
      toast.error(e instanceof Error ? e.message : "Fel PIN-kod");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetup() {
    if (pin.length !== 4 || confirmPin.length !== 4) {
      toast.error("Välj en PIN-kod med fyra siffror");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PIN-koderna matchar inte");
      setConfirmPin("");
      return;
    }
    setBusy(true);
    try {
      const res = await register({
        data: {
          email,
          name,
          pin,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      await applySession(res, res.email);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte skapa kontot");
    } finally {
      setBusy(false);
    }
  }

  function pushDigit(d: string) {
    if (mode === "unlock") {
      const next = (pin + d).slice(0, 4);
      setPin(next);
      if (next.length === 4) void handleUnlock(next);
      return;
    }
    if (pin.length < 4) setPin((p) => p + d);
    else setConfirmPin((p) => (p + d).slice(0, 4));
  }

  function back() {
    if (mode === "unlock") return setPin((p) => p.slice(0, -1));
    if (confirmPin.length > 0) return setConfirmPin((p) => p.slice(0, -1));
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary text-2xl text-primary-foreground shadow-soft">
            ✦
          </div>
          <h1 className="mt-5 font-display text-3xl text-foreground">Dagsform</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "unlock" ? "Skriv din PIN-kod för att fortsätta" : "Vi sätter upp ditt konto en gång"}
          </p>
        </div>

        {mode === "setup" ? (
          <div className="mt-7 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="name">
                Vad heter du?
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="William"
                className="h-14 rounded-2xl text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="email">
                E-post
              </label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="du@exempel.se"
                className="h-14 rounded-2xl text-base"
              />
              <p className="text-xs text-muted-foreground">
                Används för påminnelser via mail och om du glömmer din PIN-kod. Du behöver aldrig skriva den igen på
                den här telefonen.
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-4">
              <p className="text-center text-sm font-semibold text-foreground">
                {pin.length < 4 ? "Välj PIN-kod" : "Skriv PIN-koden igen"}
              </p>
              <div className="mt-3">
                <Dots length={pin.length < 4 ? pin.length : confirmPin.length} />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <Dots length={pin.length} />
            {savedEmail ? (
              <p className="mt-4 text-center text-xs text-muted-foreground">{savedEmail}</p>
            ) : null}
          </div>
        )}

        <div className="mt-7">
          <Keypad onDigit={pushDigit} onBack={back} disabled={busy} />
        </div>

        {mode === "setup" ? (
          <button
            type="button"
            onClick={handleSetup}
            disabled={busy || !name || !email || pin.length !== 4 || confirmPin.length !== 4}
            className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : null}
            Skapa mitt konto
          </button>
        ) : busy ? (
          <div className="mt-5 flex justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : null}

        <div className="mt-6 text-center">
          {mode === "unlock" ? (
            <button
              type="button"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setMode("setup");
                setPin("");
                setConfirmPin("");
              }}
            >
              Skapa nytt konto
            </button>
          ) : (
            <button
              type="button"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setMode("unlock");
                setPin("");
                setConfirmPin("");
              }}
            >
              Jag har redan ett konto
            </button>
          )}
        </div>

        {mode === "unlock" && !savedEmail ? (
          <div className="mt-5 space-y-2">
            <label className="text-sm font-semibold text-foreground" htmlFor="email-unlock">
              E-post (bara första gången på den här enheten)
            </label>
            <Input
              id="email-unlock"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@exempel.se"
              className="h-14 rounded-2xl text-base"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
