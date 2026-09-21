import { createFileRoute } from "@tanstack/react-router";
import { runReminders } from "@/lib/reminders.server";

function authorized(request: Request) {
  const secret = process.env["LOVABLE_CRON_SECRET"];
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  return header === secret;
}

export const Route = createFileRoute("/api/public/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        try {
          const result = await runReminders();
          return Response.json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Okänt fel";
          console.error("reminders failed", message);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
