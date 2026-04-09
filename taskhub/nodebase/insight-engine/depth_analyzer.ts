/**
 * Analyze on-chain orderbook depth for a given market.
 */
export interface Order {
  price: number
  size: number
}

export interface DepthMetrics {
  averageBidDepth: number
  averageAskDepth: number
  spread: number
  spreadPct?: number
  bestBid?: number
  bestAsk?: number
  vwapBid?: number
  vwapAsk?: number
  bidNotional?: number
  askNotional?: number
  depthImbalance?: number
}

type Orderbook = { bids: Order[]; asks: Order[] }

export class TokenDepthAnalyzer {
  constructor(private rpcEndpoint: string, private marketId: string) {}

  /**
   * Fetch orderbook snapshot with optional depth and timeout.
   */
  async fetchOrderbook(depth = 50, timeoutMs = 10_000): Promise<Orderbook> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const url = `${this.rpcEndpoint}/orderbook/${encodeURIComponent(this.marketId)}?depth=${depth}`
      const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } })
      if (!res.ok) throw new Error(`Orderbook fetch failed: ${res.status} ${res.statusText}`)
      const json = await res.json()
      return this.normalizeOrderbook(json)
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Compute depth metrics for the given snapshot depth.
   */
  async analyze(depth = 50): Promise<DepthMetrics> {
    const { bids, asks } = await this.fetchOrderbook(depth)
    const avg = (arr: Order[]) => (arr.length ? arr.reduce((s, o) => s + o.size, 0) / arr.length : 0)
    const sumNotional = (arr: Order[]) => arr.reduce((s, o) => s + o.size * o.price, 0)
    const vwap = (arr: Order[]) => {
      const qty = arr.reduce((s, o) => s + o.size, 0)
      const notional = sumNotional(arr)
      return qty > 0 ? notional / qty : 0
    }

    const bestBid = bids[0]?.price ?? 0
    const bestAsk = asks[0]?.price ?? 0
    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0
    const mid = bestAsk > 0 && bestBid > 0 ? (bestAsk + bestBid) / 2 : 0
    const spreadPct = mid > 0 ? (spread / mid) * 100 : 0

    const bidNotional = sumNotional(bids)
    const askNotional = sumNotional(asks)
    const totalNotional = bidNotional + askNotional
    const depthImbalance = totalNotional > 0 ? (bidNotional - askNotional) / totalNotional : 0

    return {
      averageBidDepth: avg(bids),
      averageAskDepth: avg(asks),
      spread,
      spreadPct: Math.round(spreadPct * 100) / 100,
      bestBid,
      bestAsk,
      vwapBid: Math.round(vwap(bids) * 100) / 100,
      vwapAsk: Math.round(vwap(asks) * 100) / 100,
      bidNotional: Math.round(bidNotional * 100) / 100,
      askNotional: Math.round(askNotional * 100) / 100,
      depthImbalance: Math.round(depthImbalance * 1_0000) / 1_0000,
    }
  }

  /**
   * Analyze a provided snapshot (useful for testing or caching scenarios).
   */
  analyzeSnapshot(snapshot: Orderbook): DepthMetrics {
    const normalize = this.normalizeOrderbook(snapshot)
    const clone = new TokenDepthAnalyzer(this.rpcEndpoint, this.marketId)
    ;(clone as any).fetchOrderbook = async () => normalize
    return (clone as any).analyze(0)
  }

  /**
   * Normalize and sort raw orderbook sides.
   */
  private normalizeOrderbook(raw: any): Orderbook {
    const normSide = (side: any, sort: "asc" | "desc"): Order[] =>
      Array.isArray(side)
        ? side
            .map((o) => ({ price: Number(o.price), size: Number(o.size) }))
            .filter((o) => Number.isFinite(o.price) && Number.isFinite(o.size) && o.price > 0 && o.size >= 0)
            .sort((a, b) => (sort === "asc" ? a.price - b.price : b.price - a.price))
        : []
    return {
      bids: normSide(raw?.bids, "desc"),
      asks: normSide(raw?.asks, "asc"),
    }
  }
}
