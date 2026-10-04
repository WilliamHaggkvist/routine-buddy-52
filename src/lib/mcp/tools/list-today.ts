import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, todayStr } from "../supabase";

export default defineTool({
  name: "list_tasks",
  title: "List tasks",
  description: "List the signed-in user's open tasks, optionally only those due on a given date (YYYY-MM-DD).",
  inputSchema: {
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Only tasks due this date. Use 'today' semantics by passing today's date."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ day }, ctx) => {
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("tasks")
      .select("id, title, due_date, due_time, time_band, priority, list_id, notes")
      .eq("is_archived", false)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (day) q = q.eq("due_date", day);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const { data: done } = await sb.from("task_completions").select("task_id");
    const doneSet = new Set((done ?? []).map((d) => d.task_id as string));
    const tasks = (data ?? []).map((t) => ({
      id: t.id as string,
      title: t.title as string,
      due_date: (t.due_date as string | null) ?? null,
      due_time: (t.due_time as string | null) ?? null,
      time_band: (t.time_band as string | null) ?? null,
      priority: (t.priority as number | null) ?? null,
      list_id: (t.list_id as string | null) ?? null,
      done: doneSet.has(t.id as string),
    }));
    return {
      content: [{ type: "text", text: JSON.stringify({ today: todayStr(), tasks }) }],
      structuredContent: { today: todayStr(), tasks },
    };
  },
});
