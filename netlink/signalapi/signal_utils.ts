import type { Signal } from "./SignalApiClient"

/**
 * Utility for processing and summarizing signals into actionable insights.
 */
export class SignalProcessor {
  /**
   * Filter signals by type and recency.
   * @param signals Array of Signal
   * @param type Desired signal type
   * @param sinceTimestamp Only include signals after this time
   */
  filter(signals: Signal[], type: string, sinceTimestamp: number): Signal[] {
    return signals.filter(s => s.type === type && s.timestamp > sinceTimestamp)
  }

  /**
   * Aggregate signals by type, counting occurrences.
   * @param signals Array of Signal
   */
  aggregateByType(signals: Signal[]): Record<string, number> {
    return signals.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Group signals by severity if available, fallback to "unknown".
   */
  aggregateBySeverity(signals: Signal[]): Record<string, number> {
    return signals.reduce((acc, s) => {
      const severity = (s as any).severity ?? "unknown"
      acc[severity] = (acc[severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Get the latest N signals, sorted by timestamp descending.
   */
  getLatest(signals: Signal[], count: number = 5): Signal[] {
    return [...signals].sort((a, b) => b.timestamp - a.timestamp).slice(0, count)
  }

  /**
   * Transform a signal into a human-readable summary string.
   */
  summarize(signal: Signal): string {
    const time = new Date(signal.timestamp).toISOString()
    const src = (signal as any).source ? ` [${(signal as any).source}]` : ""
    const sev = (signal as any).severity ? ` {${(signal as any).severity}}` : ""
    return `[${time}] ${signal.type.toUpperCase()}${src}${sev}: ${JSON.stringify(signal.payload)}`
  }

  /**
   * Generate summaries for multiple signals.
   */
  summarizeAll(signals: Signal[]): string[] {
    return signals.map(s => this.summarize(s))
  }
}
