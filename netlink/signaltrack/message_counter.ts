import type { SightCoreMessage } from "./WebSocketClient"

export interface AggregatedSignal {
  topic: string
  count: number
  lastPayload: any
  lastTimestamp: number
  firstTimestamp?: number
}

export class SignalAggregator {
  private counts: Record<string, AggregatedSignal> = {}

  /**
   * Process a new incoming message and update aggregation.
   */
  processMessage(msg: SightCoreMessage): AggregatedSignal {
    const { topic, payload, timestamp } = msg
    const entry: AggregatedSignal =
      this.counts[topic] || { topic, count: 0, lastPayload: null, lastTimestamp: 0, firstTimestamp: timestamp }

    entry.count += 1
    entry.lastPayload = payload
    entry.lastTimestamp = timestamp
    if (!entry.firstTimestamp) entry.firstTimestamp = timestamp

    this.counts[topic] = entry
    return entry
  }

  /**
   * Retrieve aggregation details for a specific topic.
   */
  getAggregated(topic: string): AggregatedSignal | undefined {
    return this.counts[topic]
  }

  /**
   * Retrieve all aggregated signals.
   */
  getAllAggregated(): AggregatedSignal[] {
    return Object.values(this.counts)
  }

  /**
   * Get the most active topics, sorted by count.
   */
  getTopTopics(limit: number = 5): AggregatedSignal[] {
    return Object.values(this.counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Reset all aggregations.
   */
  reset(): void {
    this.counts = {}
  }

  /**
   * Export aggregated signals as a plain object map for external use.
   */
  toObject(): Record<string, AggregatedSignal> {
    return { ...this.counts }
  }
}
