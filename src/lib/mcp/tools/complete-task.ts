import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, todayStr } from "../supabase";

export default defineTool({
  name: "complete_task",
  title: "Complete task",
  description: "Mark one of the signed-in user's tasks as done today.",
  inputSchema: { task_id: z.string().uuid().describe("Task id from list_tasks.") },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ task_id }, ctx) => {
    const sb = supabaseForUser(ctx);
    const { error } = await sb
      .from("task_completions")
      .upsert({ user_id: ctx.getUserId(), task_id, completed_on: todayStr() }, { onConflict: "task_id,completed_on" });
    if (error) throw new ToolError(error.message);
    return { content: [{ type: "text", text: "Uppgiften är avbockad." }] };
  },
});
