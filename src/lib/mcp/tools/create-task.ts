import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const bandTimes: Record<string, string> = { morgon: "07:00", formiddag: "10:00", eftermiddag: "13:00", kvall: "18:00" };

export default defineTool({
  name: "create_task",
  title: "Create task",
  description: "Add a task for the signed-in user. Without a date it lands in the inbox.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Task title."),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Due date YYYY-MM-DD."),
    due_time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("Exact time HH:MM."),
    time_band: z.enum(["morgon", "formiddag", "eftermiddag", "kvall"]).optional().describe("Part of day instead of exact time."),
    priority: z.number().int().min(1).max(3).optional().describe("Priority 1 (highest) to 3."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("tasks")
      .insert({
        user_id: ctx.getUserId(),
        title: input.title,
        due_date: input.due_date ?? null,
        due_time: input.time_band ? bandTimes[input.time_band] : input.due_time ?? null,
        time_band: input.time_band ?? null,
        priority: input.priority ?? null,
      })
      .select("id, title")
      .single();
    if (error) throw new ToolError(error.message);
    return { content: [{ type: "text", text: `Skapade "${data.title}" (${data.id})` }] };
  },
});
