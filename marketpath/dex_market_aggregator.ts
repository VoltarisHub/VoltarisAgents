export interface PairInfo {
  exchange: string
  pairAddress: string
  baseSymbol: string
  quoteSymbol: string
  liquidityUsd: number
  volume24hUsd: number
  priceUsd: number
  updatedAt?: number
}

export interface DexSuiteConfig {
  apis: Array<{ name: string; baseUrl: string; apiKey?: string }>
  timeoutMs?: number
}

type ApiDef = { name: string; baseUrl: string; apiKey?: string }
type PairComparison = { bestVolume?: PairInfo; bestLiquidity?: PairInfo }

export class DexSuite {
  constructor(private config: DexSuiteConfig) {}

  private async fetchFromApi<T>(api: ApiDef, path: string): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 10_000)
    try {
      const res = await fetch(`${api.baseUrl}${path}`, {
        headers: {
          Accept: "application/json",
          ...(api.apiKey ? { Authorization: `Bearer ${api.apiKey}` } : {}),
        },
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`${api.name} ${path} ${res.status} ${res.statusText}`)
      return (await res.json()) as T
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Normalize API response into PairInfo
   */
  private toPairInfo(api: ApiDef, pairAddress: string, data: any): PairInfo | null {
    const price = Number(data?.priceUsd)
    const liq = Number(data?.liquidityUsd)
    const vol = Number(data?.volume24hUsd)
    const base = data?.token0?.symbol
    const quote = data?.token1?.symbol
    if (!isFinite(price) || !isFinite(liq) || !isFinite(vol) || !base || !quote) return null
    return {
      exchange: api.name,
      pairAddress,
      baseSymbol: String(base),
      quoteSymbol: String(quote),
      liquidityUsd: liq,
      volume24hUsd: vol,
      priceUsd: price,
      updatedAt: Date.now(),
    }
  }

  /**
   * Retrieve aggregated pair info across all configured DEX APIs.
   * @param pairAddress Blockchain address of the trading pair
   */
  async getPairInfo(pairAddress: string): Promise<PairInfo[]> {
    const results: PairInfo[] = []
    const tasks = this.config.apis.map(async (api) => {
      try {
        const raw = await this.fetchFromApi<any>(api, `/pair/${encodeURIComponent(pairAddress)}`)
        const info = this.toPairInfo(api, pairAddress, raw)
        if (info) results.push(info)
      } catch {
        // skip failed API
      }
    })
    await Promise.all(tasks)
    return results
  }

  /**
   * Compare a list of pairs across exchanges, returning the best volume and liquidity.
   */
  async comparePairs(
    pairs: string[]
  ): Promise<Record<string, PairComparison>> {
    const entries = await Promise.all(
      pairs.map(async (addr) => {
        const infos = await this.getPairInfo(addr)
        if (infos.length === 0) return [addr, {}] as const
        const bestVolume = infos.reduce((a, b) => (b.volume24hUsd > a.volume24hUsd ? b : a))
        const bestLiquidity = infos.reduce((a, b) => (b.liquidityUsd > a.liquidityUsd ? b : a))
        return [addr, { bestVolume, bestLiquidity }] as const
      })
    )
    return Object.fromEntries(entries)
  }

  /**
   * Find price spread across exchanges for a single pair
   */
  async findArbitrage(pairAddress: string): Promise<{
    highest?: PairInfo
    lowest?: PairInfo
    spreadPct?: number
  }> {
    const infos = await this.getPairInfo(pairAddress)
    if (infos.length < 2) return {}
    const highest = infos.reduce((a, b) => (b.priceUsd > a.priceUsd ? b : a))
    const lowest = infos.reduce((a, b) => (b.priceUsd < a.priceUsd ? b : a))
    const spreadPct =
      lowest.priceUsd > 0
        ? Math.round(((highest.priceUsd - lowest.priceUsd) / lowest.priceUsd) * 10_000) / 100
        : undefined
    return { highest, lowest, spreadPct }
  }

  /**
   * Batch price spreads for many pairs
   */
  async findArbitrageForPairs(
    pairs: string[]
  ): Promise<Record<string, { highest?: PairInfo; lowest?: PairInfo; spreadPct?: number }>> {
    const entries = await Promise.all(
      pairs.map(async (p) => [p, await this.findArbitrage(p)] as const)
    )
    return Object.fromEntries(entries)
  }

  /**
   * Health check: returns the list of APIs reachable within timeout
   */
  async pingApis(): Promise<{ name: string; ok: boolean }[]> {
    const checks = await Promise.all(
      this.config.apis.map(async (api) => {
        try {
          await this.fetchFromApi<any>(api, "/status")
          return { name: api.name, ok: true }
        } catch {
          return { name: api.name, ok: false }
        }
      })
    )
    return checks
  }
}
