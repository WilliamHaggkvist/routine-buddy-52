import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: any; userId: string; claims: Record<string, unknown> };

export const getVapidKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env["VAPID_PUBLIC_KEY"] ?? null };
});

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(10),
  auth: z.string().min(5),
  label: z.string().optional(),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof subscriptionSchema>) => subscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { error } = await ctx.supabase.from("push_subscriptions").upsert(
      {
        user_id: ctx.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        label: data.label ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint: string }) => z.object({ endpoint: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await ctx.supabase.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const { sendWebPush } = await import("./web-push.server");
    const { data: subs } = await ctx.supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", ctx.userId);

    if (!subs || subs.length === 0) return { ok: false as const, sent: 0, error: "Inga enheter är kopplade" };

    let sent = 0;
    let lastError: string | null = null;
    for (const sub of subs) {
      const res = await sendWebPush(sub as any, {
        title: "Testnotis från Dagsform ✦",
        body: "Så här kommer dina påminnelser att se ut.",
        url: "/idag",
        tag: "test",
      });
      if (res.ok) sent += 1;
      else {
        lastError = res.error;
        if (res.stale) await ctx.supabase.from("push_subscriptions").delete().eq("id", (sub as any).id);
      }
    }
    return { ok: sent > 0, sent, error: lastError };
  });
