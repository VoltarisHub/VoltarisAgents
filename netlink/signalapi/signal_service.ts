export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
  source?: string
  severity?: "low" | "medium" | "high"
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  durationMs?: number
}

export interface SearchParams {
  type?: string
  since?: number // inclusive (epoch ms)
  until?: number // inclusive (epoch ms)
  limit?: number
  cursor?: string
}

export class SignalApiClient {
  constructor(
    private baseUrl: string,
    private apiKey?: string,
    private timeoutMs: number = 10_000
  ) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  private async request<T>(path: string): Promise<ApiResponse<T>> {
    const start = Date.now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: controller.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return {
          success: false,
          error: `HTTP ${res.status}${text ? `: ${text}` : ""}`,
          durationMs: Date.now() - start,
        }
      }
      const data = (await res.json()) as T
      return { success: true, data, durationMs: Date.now() - start }
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err), durationMs: Date.now() - start }
    } finally {
      clearTimeout(timer)
    }
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    return this.request<Signal[]>("/signals")
  }

  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    const safeId = encodeURIComponent(id)
    return this.request<Signal>(`/signals/${safeId}`)
  }

  /**
   * Search signals with optional filters and pagination
   */
  async searchSignals(params: SearchParams = {}): Promise<ApiResponse<{
    items: Signal[]
    nextCursor?: string
  }>> {
    const url = new URL(`${this.baseUrl}/signals/search`)
    if (params.type) url.searchParams.set("type", params.type)
    if (typeof params.since === "number") url.searchParams.set("since", String(params.since))
    if (typeof params.until === "number") url.searchParams.set("until", String(params.until))
    if (typeof params.limit === "number") url.searchParams.set("limit", String(params.limit))
    if (params.cursor) url.searchParams.set("cursor", params.cursor)

    // preserve base path but use query from URL
    const pathWithQuery = url.toString().replace(this.baseUrl, "")
    return this.request<{ items: Signal[]; nextCursor?: string }>(pathWithQuery)
  }

  /**
   * Convenience: fetch the most recent signal (by timestamp) for a type
   */
  async fetchLatest(type?: string): Promise<ApiResponse<Signal | null>> {
    const res = await this.searchSignals({ type, limit: 1 })
    if (!res.success) return res as ApiResponse<Signal | null>
    const first = res.data?.items?.[0] ?? null
    return { success: true, data: first, durationMs: res.durationMs }
  }
}
