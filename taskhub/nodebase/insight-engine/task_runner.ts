/**
 * Task executor: registers handlers and runs queued tasks.
 */
type Handler = (params: any) => Promise<any>

export interface TaskResult {
  id: string
  result?: any
  error?: string
  startedAt: number
  finishedAt: number
}

export class ExecutionEngine {
  private handlers: Record<string, Handler> = {}
  private queue: Array<{ id: string; type: string; params: any; timeoutMs?: number }> = []

  /**
   * Register a handler for a given task type.
   * Throws if the handler already exists.
   */
  register(type: string, handler: Handler): void {
    if (this.handlers[type]) {
      throw new Error(`Handler for type "${type}" is already registered`)
    }
    this.handlers[type] = handler
  }

  /**
   * Add a task to the queue.
   */
  enqueue(id: string, type: string, params: any, timeoutMs?: number): void {
    if (!this.handlers[type]) throw new Error(`No handler for ${type}`)
    this.queue.push({ id, type, params, timeoutMs })
  }

  /**
   * Run all tasks in the queue sequentially.
   */
  async runAll(): Promise<TaskResult[]> {
    const results: TaskResult[] = []
    while (this.queue.length) {
      const task = this.queue.shift()!
      const startedAt = Date.now()
      try {
        const handler = this.handlers[task.type]
        const data = task.timeoutMs
          ? await this.runWithTimeout(handler, task.params, task.timeoutMs)
          : await handler(task.params)

        results.push({
          id: task.id,
          result: data,
          startedAt,
          finishedAt: Date.now(),
        })
      } catch (err: any) {
        results.push({
          id: task.id,
          error: err?.message || String(err),
          startedAt,
          finishedAt: Date.now(),
        })
      }
    }
    return results
  }

  /**
   * Clear all queued tasks.
   */
  clearQueue(): void {
    this.queue = []
  }

  /**
   * Run a promise with a timeout.
   */
  private runWithTimeout(handler: Handler, params: any, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Task timed out after ${timeoutMs}ms`)), timeoutMs)
      handler(params)
        .then(res => {
          clearTimeout(timer)
          resolve(res)
        })
        .catch(err => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }
}
