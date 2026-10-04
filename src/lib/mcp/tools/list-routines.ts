import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_routines",
  title: "List routines",
  description: "List the signed-in user's routines with their steps, weekdays and time windows.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const sb = supabaseForUser(ctx);
    const [{ data: r, error }, { data: s }] = await Promise.all([
      sb.from("routines").select("id, name, emoji, days, window_start, window_end, is_active").order("sort_order"),
      sb.from("routine_steps").select("id, routine_id, title").order("sort_order"),
    ]);
    if (error) throw new ToolError(error.message);
    const routines = (r ?? []).map((x) => ({
      id: x.id as string,
      name: x.name as string,
      days: ((x.days as number[] | null) ?? []).map((d) => d),
      window_start: (x.window_start as string | null) ?? null,
      window_end: (x.window_end as string | null) ?? null,
      is_active: Boolean(x.is_active),
      steps: (s ?? []).filter((st) => st.routine_id === x.id).map((st) => st.title as string),
    }));
    return { content: [{ type: "text", text: JSON.stringify(routines) }], structuredContent: { routines } };
  },
});
