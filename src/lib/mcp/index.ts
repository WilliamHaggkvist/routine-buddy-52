import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTasks from "./tools/list-today";
import createTask from "./tools/create-task";
import completeTask from "./tools/complete-task";
import listRoutines from "./tools/list-routines";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "daily-flow",
  title: "Daily Flow",
  version: "0.1.0",
  instructions:
    "Tools for the user's Dagsform to-dos and routines. Use list_tasks to see tasks, create_task to add one, complete_task to tick one off, and list_routines to see routines.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTasks, createTask, completeTask, listRoutines],
});
