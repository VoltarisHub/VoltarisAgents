import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Toolkit exposing liquidity-related analysis and scanning tools.
 */
export const EXTENDED_LIQUIDITY_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Helper: get all available liquidity tool keys.
 */
export function getLiquidityToolKeys(): string[] {
  return Object.keys(EXTENDED_LIQUIDITY_TOOLS)
}

/**
 * Helper: check if a tool exists by key.
 */
export function hasLiquidityTool(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(EXTENDED_LIQUIDITY_TOOLS, key)
}
