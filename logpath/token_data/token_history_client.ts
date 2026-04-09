export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
}

export class TokenDataFetcher {
  constructor(private apiBase: string, private timeoutMs: number = 10000) {}

  /**
   * Fetches an array of TokenDataPoint for the given token symbol.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string): Promise<TokenDataPoint[]> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(
        `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history`,
        { signal: controller.signal }
      )
      if (!res.ok) {
        throw new Error(`Failed to fetch history for ${symbol}: ${res.status}`)
      }
      const raw = (await res.json()) as any[]
      return raw.map(r => ({
        timestamp: Number(r.time) * 1000,
        priceUsd: Number(r.priceUsd),
        volumeUsd: Number(r.volumeUsd),
        marketCapUsd: Number(r.marketCapUsd),
      }))
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Fetch the latest data point for a given token symbol.
   */
  async fetchLatest(symbol: string): Promise<TokenDataPoint | null> {
    const history = await this.fetchHistory(symbol)
    return history.length > 0 ? history[history.length - 1] : null
  }
}
