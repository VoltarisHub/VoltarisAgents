import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"

/**
 * In-memory store for scheduled tasks (replace with a real DB / scheduler in prod).
 */
const scheduledTasks: Record<
  string,
  {
    id: string
    name: string
    type: TaskFormInput["taskType"]
    parameters: TaskFormInput["parameters"]
    cron?: string
    createdAt: number
  }
> = {}

/**
 * Generate a stable task id.
 */
function genTaskId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now()}-${rand}`
}

/**
 * Processes a Typeform webhook payload to schedule a new task.
 */
export async function handleTypeformSubmission(
  raw: unknown
): Promise<{ success: boolean; message: string }> {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: `Validation error: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    }
  }

  const { taskName, taskType, parameters, scheduleCron } = parsed.data as TaskFormInput

  // Normalization / minor safety checks
  const name = taskName.trim()
  const id = genTaskId(taskType)

  try {
    // Simulate scheduling (store to memory). Replace with real cron scheduler integration.
    scheduledTasks[id] = {
      id,
      name,
      type: taskType,
      parameters,
      cron: scheduleCron || undefined,
      createdAt: Date.now(),
    }

    // Optional: lightweight log for observability
    // (swap to proper logger in production)
    console.log(
      `[TaskScheduled] id=${id} type=${taskType} name="${name}" cron="${scheduleCron ?? "-"}"`
    )

    return { success: true, message: `Task "${name}" scheduled with ID ${id}` }
  } catch (err: any) {
    return { success: false, message: `Task scheduling failed: ${err?.message || String(err)}` }
  }
}

/**
 * Optional helpers for introspection (useful in tests/admin tools)
 */
export function getScheduledTask(id: string) {
  return scheduledTasks[id]
}

export function listScheduledTasks() {
  return Object.values(scheduledTasks)
}
