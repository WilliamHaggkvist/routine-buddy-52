import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const pinSchema = z
  .string()
  .regex(/^\d{4}$/, "PIN-koden måste vara fyra siffror");

async function derivePassword(email: string, pin: string) {
  const pepper = process.env["PIN_PEPPER"] ?? "";
  const data = new TextEncoder().encode(`${email.toLowerCase()}::${pin}::${pepper}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return (
    "pin_" +
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function serverClient(key: string, url: string) {
  return import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    }),
  );
}

export const registerWithPin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; name: string; pin: string; timezone?: string }) =>
    z
      .object({
        email: z.string().email("Skriv en giltig e-postadress"),
        name: z.string().min(1, "Skriv ditt namn"),
        pin: pinSchema,
        timezone: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = await derivePassword(data.email, data.pin);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { display_name: data.name },
    });

    if (error || !created.user) {
      const msg = (error?.message ?? "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        throw new Error("Den e-postadressen finns redan. Logga in med din PIN-kod i stället.");
      }
      throw new Error(error?.message ?? "Kunde inte skapa kontot");
    }

    await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      display_name: data.name,
      email: data.email.toLowerCase(),
      timezone: data.timezone ?? "Europe/Stockholm",
    });
    await supabaseAdmin.from("notification_settings").insert({ user_id: created.user.id });

    // Starter-innehåll så första skärmen inte är tom
    const { data: routine } = await supabaseAdmin
      .from("routines")
      .insert({
        user_id: created.user.id,
        name: "Kvällsrutin",
        emoji: "🌙",
        window_start: "20:00",
        window_end: "23:59",
        sort_order: 0,
      })
      .select("id")
      .single();
    if (routine) {
      await supabaseAdmin.from("routine_steps").insert(
        ["Ställ fram morgondagens kläder", "Borsta tänderna", "Hudvård", "Ladda telefonen", "Släck och lägg dig"].map(
          (title, i) => ({ user_id: created.user!.id, routine_id: routine.id, title, sort_order: i }),
        ),
      );
    }
    const { data: morning } = await supabaseAdmin
      .from("routines")
      .insert({
        user_id: created.user.id,
        name: "Morgonrutin",
        emoji: "☀️",
        window_start: "06:00",
        window_end: "11:00",
        sort_order: 1,
      })
      .select("id")
      .single();
    if (morning) {
      await supabaseAdmin.from("routine_steps").insert(
        ["Drick ett glas vatten", "Frukost", "Medicin", "Hudvård", "Kläder på"].map((title, i) => ({
          user_id: created.user!.id,
          routine_id: morning.id,
          title,
          sort_order: i,
        })),
      );
    }
    await supabaseAdmin
      .from("lists")
      .insert([
        { user_id: created.user.id, name: "Hemma", emoji: "🏠", sort_order: 0 },
        { user_id: created.user.id, name: "Kanske sen", emoji: "💭", sort_order: 1 },
      ]);

    const url = process.env["SUPABASE_URL"]!;
    const publishable = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = await serverClient(publishable, url);
    const { data: session, error: signInError } = await client.auth.signInWithPassword({
      email: data.email.toLowerCase(),
      password,
    });
    if (signInError || !session.session) throw new Error("Kontot skapades men inloggningen misslyckades");

    return {
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
      email: data.email.toLowerCase(),
      name: data.name,
    };
  });

export const signInWithPin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; pin: string }) =>
    z.object({ email: z.string().email("Skriv en giltig e-postadress"), pin: pinSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"]!;
    const publishable = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const password = await derivePassword(data.email, data.pin);
    const client = await serverClient(publishable, url);
    const { data: session, error } = await client.auth.signInWithPassword({
      email: data.email.toLowerCase(),
      password,
    });
    if (error || !session.session) throw new Error("Fel PIN-kod. Försök igen.");
    return {
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
      email: data.email.toLowerCase(),
    };
  });

export const changePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { currentPin: string; newPin: string }) =>
    z.object({ currentPin: pinSchema, newPin: pinSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string }).email;
    if (!email) throw new Error("Kontot saknar e-postadress");

    const url = process.env["SUPABASE_URL"]!;
    const publishable = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = await serverClient(publishable, url);
    const current = await derivePassword(email, data.currentPin);
    const { error: verifyError } = await client.auth.signInWithPassword({ email, password: current });
    if (verifyError) throw new Error("Nuvarande PIN-kod stämmer inte");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const next = await derivePassword(email, data.newPin);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, { password: next });
    if (error) throw new Error("Kunde inte byta PIN-kod");
    return { ok: true };
  });
