import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

type Ctx = { supabase: any; userId: string; claims: Record<string, unknown> };

function dueToday(task: { due_date: string | null }, day: string) {
  return task.due_date === day;
}

async function recomputeDay(ctx: Ctx, day: string) {
  const weekday = new Date(`${day}T12:00:00`).getDay();
  const { data: tasks } = await ctx.supabase
    .from("tasks")
    .select("id, due_date")
    .eq("is_archived", false)
    .is("parent_id", null);
  const todays = (tasks ?? []).filter((t: any) => dueToday(t, day));

  const { data: taskDone } = await ctx.supabase
    .from("task_completions")
    .select("task_id")
    .eq("completed_on", day);

  const { data: routines } = await ctx.supabase.from("routines").select("id, days").eq("is_active", true);
  const activeRoutines = (routines ?? []).filter((r: any) => (r.days ?? []).includes(weekday));
  const { data: steps } = await ctx.supabase.from("routine_steps").select("id, routine_id");
  const stepsToday = (steps ?? []).filter((s: any) => activeRoutines.some((r: any) => r.id === s.routine_id));
  const { data: stepDone } = await ctx.supabase
    .from("routine_step_completions")
    .select("step_id")
    .eq("completed_on", day);

  const tasksTotal = todays.length;
  const tasksDone = (taskDone ?? []).filter((c: any) => todays.some((t: any) => t.id === c.task_id)).length;
  const stepsTotal = stepsToday.length;
  const stepsDoneCount = (stepDone ?? []).filter((c: any) => stepsToday.some((s: any) => s.id === c.step_id)).length;
  const total = tasksTotal + stepsTotal;
  const done = tasksDone + stepsDoneCount;

  await ctx.supabase.from("daily_summary").upsert(
    {
      user_id: ctx.userId,
      day,
      tasks_done: tasksDone,
      tasks_total: tasksTotal,
      steps_done: stepsDoneCount,
      steps_total: stepsTotal,
      completed: total > 0 && done >= total,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,day" },
  );
}

function streakFrom(summaries: { day: string; completed: boolean }[], today: string) {
  const map = new Map(summaries.map((s) => [s.day, s.completed]));
  let streak = 0;
  let grace = 1;
  const cursor = new Date(`${today}T12:00:00`);
  // dagens dag räknas bara om den är klar, annars startar vi från igår
  if (!map.get(today)) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (map.get(key)) {
      streak += 1;
    } else if (grace > 0 && streak > 0) {
      grace -= 1;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export const getDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { day: string; weekday: number }) =>
    z.object({ day: daySchema, weekday: z.number().min(0).max(6) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { day, weekday } = data;

    const [{ data: profile }, { data: tasks }, { data: completions }, { data: routines }, { data: steps }, { data: stepDone }, { data: summaries }, { data: lists }, { data: notes }] =
      await Promise.all([
        ctx.supabase.from("profiles").select("*").eq("id", ctx.userId).maybeSingle(),
        ctx.supabase.from("tasks").select("*").eq("is_archived", false).order("sort_order"),
        ctx.supabase.from("task_completions").select("task_id, completed_on"),
        ctx.supabase.from("routines").select("*").order("sort_order"),
        ctx.supabase.from("routine_steps").select("*").order("sort_order"),
        ctx.supabase.from("routine_step_completions").select("step_id, completed_on").eq("completed_on", day),
        ctx.supabase.from("daily_summary").select("day, completed, tasks_done, tasks_total, steps_done, steps_total"),
        ctx.supabase.from("lists").select("*").order("sort_order"),
        ctx.supabase.from("notifications").select("*").is("read_at", null).order("created_at", { ascending: false }).limit(5),
      ]);

    const allTasks = tasks ?? [];
    const comps = completions ?? [];
    const doneToday = new Set(comps.filter((c: any) => c.completed_on === day).map((c: any) => c.task_id));
    const everDone = new Set(comps.map((c: any) => c.task_id));

    const parents = allTasks.filter((t: any) => !t.parent_id);
    const decorated = parents.map((t: any) => {
      const children = allTasks
        .filter((c: any) => c.parent_id === t.id)
        .map((c: any) => ({ ...c, done: doneToday.has(c.id) || everDone.has(c.id) }));
      const done = doneToday.has(t.id) || everDone.has(t.id);
      let bucket: "today" | "missed" | "later" | "backlog" = "backlog";
      if (dueToday(t, day)) bucket = "today";
      else if (t.due_date && t.due_date < day && !everDone.has(t.id)) bucket = "missed";
      else if (t.due_date && t.due_date > day) bucket = "later";
      return { ...t, children, done, bucket };
    });


    const stepDoneSet = new Set((stepDone ?? []).map((s: any) => s.step_id));
    const routineList = (routines ?? []).map((r: any) => {
      const rSteps = (steps ?? [])
        .filter((s: any) => s.routine_id === r.id)
        .map((s: any) => ({ ...s, done: stepDoneSet.has(s.id) }));
      return {
        ...r,
        steps: rSteps,
        activeToday: r.is_active && (r.days ?? []).includes(weekday),
        doneCount: rSteps.filter((s: any) => s.done).length,
      };
    });

    const todayTasks = decorated.filter((t: any) => t.bucket === "today");
    const activeRoutines = routineList.filter((r: any) => r.activeToday);
    const totalToday = todayTasks.length + activeRoutines.reduce((n: number, r: any) => n + r.steps.length, 0);
    const doneTodayCount =
      todayTasks.filter((t: any) => t.done).length + activeRoutines.reduce((n: number, r: any) => n + r.doneCount, 0);

    return {
      profile: profile ?? null,
      tasks: decorated,
      routines: routineList,
      lists: lists ?? [],
      summaries: summaries ?? [],
      notifications: notes ?? [],
      progress: { done: doneTodayCount, total: totalToday },
      streak: streakFrom((summaries ?? []) as any, day),
    };
  });

export const toggleTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { taskId: string; day: string; done: boolean }) =>
    z.object({ taskId: z.string().uuid(), day: daySchema, done: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (data.done) {
      await ctx.supabase
        .from("task_completions")
        .upsert({ user_id: ctx.userId, task_id: data.taskId, completed_on: data.day }, { onConflict: "task_id,completed_on" });
      await recomputeDay(ctx, data.day);
    } else {
      await ctx.supabase.from("task_completions").delete().eq("task_id", data.taskId).eq("completed_on", data.day);
      await recomputeDay(ctx, data.day);
    }
    return { ok: true };
  });

export const toggleStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { stepId: string; routineId: string; day: string; done: boolean }) =>
    z
      .object({ stepId: z.string().uuid(), routineId: z.string().uuid(), day: daySchema, done: z.boolean() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (data.done) {
      await ctx.supabase.from("routine_step_completions").upsert(
        { user_id: ctx.userId, step_id: data.stepId, routine_id: data.routineId, completed_on: data.day },
        { onConflict: "step_id,completed_on" },
      );
      await recomputeDay(ctx, data.day);
    } else {
      await ctx.supabase
        .from("routine_step_completions")
        .delete()
        .eq("step_id", data.stepId)
        .eq("completed_on", data.day);
      await recomputeDay(ctx, data.day);
    }
    return { ok: true };
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      title: string;
      day?: string | null;
      dueTime?: string | null;
      timeBand?: string | null;
      listId?: string | null;
      parentId?: string | null;
      priority?: number | null;
    }) =>
      z
        .object({
          title: z.string().min(1, "Skriv något först"),
          day: daySchema.nullable().optional(),
          dueTime: z.string().nullable().optional(),
          timeBand: z.enum(["morgon", "formiddag", "eftermiddag", "kvall"]).nullable().optional(),
          listId: z.string().uuid().nullable().optional(),
          parentId: z.string().uuid().nullable().optional(),
          priority: z.number().min(1).max(3).nullable().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const bandTimes: Record<string, string> = {
      morgon: "07:00",
      formiddag: "10:00",
      eftermiddag: "13:00",
      kvall: "18:00",
    };
    const { data: row, error } = await ctx.supabase
      .from("tasks")
      .insert({
        user_id: ctx.userId,
        title: data.title.trim(),
        due_date: data.day ?? null,
        due_time: data.timeBand ? bandTimes[data.timeBand]! : data.dueTime || null,
        time_band: data.timeBand ?? null,
        list_id: data.listId ?? null,
        parent_id: data.parentId ?? null,
        priority: data.priority ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    if (data.day) await recomputeDay(ctx, data.day);
    return row;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; patch: Record<string, unknown>; day?: string }) =>
    z.object({ id: z.string().uuid(), patch: z.record(z.string(), z.any()), day: daySchema.optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { error } = await ctx.supabase.from("tasks").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.day) await recomputeDay(ctx, data.day);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; day?: string }) =>
    z.object({ id: z.string().uuid(), day: daySchema.optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await ctx.supabase.from("tasks").delete().eq("id", data.id);
    if (data.day) await recomputeDay(ctx, data.day);
    return { ok: true };
  });

export const saveList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; name: string; emoji?: string }) =>
    z.object({ id: z.string().uuid().optional(), name: z.string().min(1), emoji: z.string().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (data.id) {
      await ctx.supabase.from("lists").update({ name: data.name, emoji: data.emoji ?? "📋" }).eq("id", data.id);
      return { id: data.id };
    }
    const { data: row, error } = await ctx.supabase
      .from("lists")
      .insert({ user_id: ctx.userId, name: data.name, emoji: data.emoji ?? "📋" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await ctx.supabase.from("lists").delete().eq("id", data.id);
    return { ok: true };
  });

export const saveRoutine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      emoji?: string;
      windowStart?: string;
      windowEnd?: string;
      days?: number[];
      isActive?: boolean;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          name: z.string().min(1, "Rutinen behöver ett namn"),
          emoji: z.string().optional(),
          windowStart: z.string().optional(),
          windowEnd: z.string().optional(),
          days: z.array(z.number().min(0).max(6)).optional(),
          isActive: z.boolean().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const patch: Record<string, unknown> = { name: data.name };
    if (data.emoji !== undefined) patch["emoji"] = data.emoji;
    if (data.windowStart !== undefined) patch["window_start"] = data.windowStart;
    if (data.windowEnd !== undefined) patch["window_end"] = data.windowEnd;
    if (data.days !== undefined) patch["days"] = data.days;
    if (data.isActive !== undefined) patch["is_active"] = data.isActive;

    if (data.id) {
      await ctx.supabase.from("routines").update(patch).eq("id", data.id);
      return { id: data.id };
    }
    const { data: row, error } = await ctx.supabase
      .from("routines")
      .insert({ ...patch, user_id: ctx.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRoutine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await ctx.supabase.from("routines").delete().eq("id", data.id);
    return { ok: true };
  });

export const saveStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; routineId: string; title: string; sortOrder?: number }) =>
    z
      .object({
        id: z.string().uuid().optional(),
        routineId: z.string().uuid(),
        title: z.string().min(1),
        sortOrder: z.number().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (data.id) {
      await ctx.supabase.from("routine_steps").update({ title: data.title }).eq("id", data.id);
      return { id: data.id };
    }
    const { data: row, error } = await ctx.supabase
      .from("routine_steps")
      .insert({
        user_id: ctx.userId,
        routine_id: data.routineId,
        title: data.title,
        sort_order: data.sortOrder ?? 0,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await ctx.supabase.from("routine_steps").delete().eq("id", data.id);
    return { ok: true };
  });

export const getSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const { data: settings } = await ctx.supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (!settings) {
      const { data: created } = await ctx.supabase
        .from("notification_settings")
        .insert({ user_id: ctx.userId })
        .select("*")
        .single();
      return created;
    }
    return settings;
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patch: Record<string, unknown> }) =>
    z.object({ patch: z.record(z.string(), z.any()) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await ctx.supabase
      .from("notification_settings")
      .upsert({ user_id: ctx.userId, ...data.patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    return { ok: true };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { displayName: string; timezone?: string }) =>
    z.object({ displayName: z.string().min(1), timezone: z.string().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await ctx.supabase
      .from("profiles")
      .update({ display_name: data.displayName, ...(data.timezone ? { timezone: data.timezone } : {}) })
      .eq("id", ctx.userId);
    return { ok: true };
  });

export const pushNudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; body?: string; kind?: string }) =>
    z.object({ title: z.string().min(1), body: z.string().optional(), kind: z.string().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await ctx.supabase.from("notifications").insert({
      user_id: ctx.userId,
      title: data.title,
      body: data.body ?? null,
      kind: data.kind ?? "nudge",
    });
    return { ok: true };
  });

export const markNudgeRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await ctx.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });
