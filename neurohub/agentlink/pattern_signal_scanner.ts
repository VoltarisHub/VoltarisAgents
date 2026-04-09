import fetch from "node-fetch"

/*------------------------------------------------------
 * Types
 *----------------------------------------------------*/

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export type CandlestickPattern =
  | "Hammer"
  | "ShootingStar"
  | "BullishEngulfing"
  | "BearishEngulfing"
  | "Doji"

export interface PatternSignal {
  timestamp: number
  pattern: CandlestickPattern
  confidence: number
}

/*------------------------------------------------------
 * Detector
 *----------------------------------------------------*/

export class CandlestickPatternDetector {
  constructor(private readonly apiUrl: string) {}

  /* Fetch recent OHLC candles */
  async fetchCandles(symbol: string, limit = 100): Promise<Candle[]> {
    const res = await fetch(`${this.apiUrl}/markets/${symbol}/candles?limit=${limit}`, {
      // node-fetch supports a timeout option
      timeout: 10_000,
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch candles ${res.status}: ${res.statusText}`)
    }
    const data = (await res.json()) as Candle[]
    return this.normalizeCandles(data)
  }

  /* ------------------------- Pattern helpers ---------------------- */

  private isHammer(c: Candle): number {
    const body = Math.abs(c.close - c.open)
    const total = c.high - c.low
    if (total <= 0) return 0
    const lowerWick = Math.min(c.open, c.close) - c.low
    const ratio = body > 0 ? lowerWick / body : 0
    const bodyShare = body / total
    return ratio > 2 && bodyShare < 0.3 ? this.clamp(ratio / 3) : 0
  }

  private isShootingStar(c: Candle): number {
    const body = Math.abs(c.close - c.open)
    const total = c.high - c.low
    if (total <= 0) return 0
    const upperWick = c.high - Math.max(c.open, c.close)
    const ratio = body > 0 ? upperWick / body : 0
    const bodyShare = body / total
    return ratio > 2 && bodyShare < 0.3 ? this.clamp(ratio / 3) : 0
  }

  private isBullishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close > curr.open &&
      prev.close < prev.open &&
      curr.close > prev.open &&
      curr.open < prev.close
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return bodyPrev > 0 ? this.clamp(bodyCurr / Math.max(bodyPrev, 1e-9)) : 0.8
  }

  private isBearishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close < curr.open &&
      prev.close > prev.open &&
      curr.open > prev.close &&
      curr.close < prev.open
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return bodyPrev > 0 ? this.clamp(bodyCurr / Math.max(bodyPrev, 1e-9)) : 0.8
  }

  private isDoji(c: Candle): number {
    const range = c.high - c.low
    const body = Math.abs(c.close - c.open)
    if (range <= 0) return 0
    const ratio = body / range
    return ratio < 0.1 ? this.clamp(1 - ratio * 10) : 0
  }

  /* ------------------------- Public API --------------------------- */

  /**
   * Detect patterns for the entire series.
   * Returns de-duplicated signals with highest confidence per (timestamp, pattern).
   */
  detectAll(candles: Candle[], minConfidence = 0.2): PatternSignal[] {
    const series = this.prepareCandles(candles)
    const out: PatternSignal[] = []

    for (let i = 0; i < series.length; i++) {
      const c = series[i]
      const prev = i > 0 ? series[i - 1] : undefined

      const hammer = this.isHammer(c)
      if (hammer >= minConfidence) out.push({ timestamp: c.timestamp, pattern: "Hammer", confidence: hammer })

      const star = this.isShootingStar(c)
      if (star >= minConfidence) out.push({ timestamp: c.timestamp, pattern: "ShootingStar", confidence: star })

      if (prev) {
        const bull = this.isBullishEngulfing(prev, c)
        if (bull >= minConfidence) out.push({ timestamp: c.timestamp, pattern: "BullishEngulfing", confidence: bull })

        const bear = this.isBearishEngulfing(prev, c)
        if (bear >= minConfidence) out.push({ timestamp: c.timestamp, pattern: "BearishEngulfing", confidence: bear })
      }

      const doji = this.isDoji(c)
      if (doji >= minConfidence) out.push({ timestamp: c.timestamp, pattern: "Doji", confidence: doji })
    }

    return this.deduplicateKeepMax(out).sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Detect patterns using only the latest candle (and previous when required).
   */
  detectLatest(candles: Candle[], minConfidence = 0.2): PatternSignal[] {
    const series = this.prepareCandles(candles)
    if (series.length === 0) return []
    const last = series[series.length - 1]
    const prev = series.length > 1 ? series[series.length - 2] : undefined
    const signals: PatternSignal[] = []

    const hammer = this.isHammer(last)
    if (hammer >= minConfidence) signals.push({ timestamp: last.timestamp, pattern: "Hammer", confidence: hammer })

    const star = this.isShootingStar(last)
    if (star >= minConfidence) signals.push({ timestamp: last.timestamp, pattern: "ShootingStar", confidence: star })

    if (prev) {
      const bull = this.isBullishEngulfing(prev, last)
      if (bull >= minConfidence) signals.push({ timestamp: last.timestamp, pattern: "BullishEngulfing", confidence: bull })

      const bear = this.isBearishEngulfing(prev, last)
      if (bear >= minConfidence) signals.push({ timestamp: last.timestamp, pattern: "BearishEngulfing", confidence: bear })
    }

    const doji = this.isDoji(last)
    if (doji >= minConfidence) signals.push({ timestamp: last.timestamp, pattern: "Doji", confidence: doji })

    return this.deduplicateKeepMax(signals)
  }

  /* ------------------------- Utilities ---------------------------- */

  private clamp(v: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, v))
  }

  private normalizeCandles(candles: Candle[]): Candle[] {
    return candles
      .filter(
        (c) =>
          Number.isFinite(c.timestamp) &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close)
      )
      .map((c) => ({
        timestamp: Math.trunc(c.timestamp),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      }))
  }

  private prepareCandles(candles: Candle[]): Candle[] {
    const arr = this.normalizeCandles(candles)
    arr.sort((a, b) => a.timestamp - b.timestamp)
    return arr
  }

  private deduplicateKeepMax(signals: PatternSignal[]): PatternSignal[] {
    const map = new Map<string, PatternSignal>()
    for (const s of signals) {
      const key = `${s.timestamp}:${s.pattern}`
      const prev = map.get(key)
      if (!prev || s.confidence > prev.confidence) map.set(key, s)
    }
    return Array.from(map.values())
  }
}
