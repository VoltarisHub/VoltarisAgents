import { execCommand } from "./execCommand"

export interface ShellTask {
  id: string
  command: string
  description?: string
  cwd?: string
  env?: NodeJS.ProcessEnv
}

export interface ShellResult {
  taskId: string
  output?: string
  error?: string
  executedAt: number
  durationMs: number
}

export class ShellTaskRunner {
  private tasks: ShellTask[] = []

  /**
   * Schedule a shell task for execution.
   */
  scheduleTask(task: ShellTask): void {
    this.tasks.push(task)
  }

  /**
   * List all currently scheduled tasks without executing them.
   */
  listTasks(): ShellTask[] {
    return [...this.tasks]
  }

  /**
   * Execute all scheduled tasks in sequence.
   */
  async runAll(): Promise<ShellResult[]> {
    const results: ShellResult[] = []
    for (const task of this.tasks) {
      const start = Date.now()
      try {
        const output = await execCommand(task.command, 30_000, task.cwd, task.env)
        results.push({
          taskId: task.id,
          output,
          executedAt: start,
          durationMs: Date.now() - start,
        })
      } catch (err: any) {
        results.push({
          taskId: task.id,
          error: err.message,
          executedAt: start,
          durationMs: Date.now() - start,
        })
      }
    }
    // clear after running
    this.tasks = []
    return results
  }

  /**
   * Execute a single task immediately without scheduling.
   */
  async runTask(task: ShellTask): Promise<ShellResult> {
    const start = Date.now()
    try {
      const output = await execCommand(task.command, 30_000, task.cwd, task.env)
      return {
        taskId: task.id,
        output,
        executedAt: start,
        durationMs: Date.now() - start,
      }
    } catch (err: any) {
      return {
        taskId: task.id,
        error: err.message,
        executedAt: start,
        durationMs: Date.now() - start,
      }
    }
  }
}
