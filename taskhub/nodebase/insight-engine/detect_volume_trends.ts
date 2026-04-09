/**
 * Detect volume-based patterns in a series of activity amounts.
 */
export interface PatternMatch {
  index: number
  window: number
  average: number
  max: number
  min: number
  stdDev: number
}

function computeStdDev(values: number[], mean: number): number {
  if (!values.length) return 0
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

export function detectVolumePatterns(
  volumes: number[],
  windowSize: number,
  threshold: number
): PatternMatch[] {
  const matches: PatternMatch[] = []
  for (let i = 0; i + windowSize <= volumes.length; i++) {
    const slice = volumes.slice(i, i + windowSize)
    const avg = slice.reduce((a, b) => a + b, 0) / windowSize
    const max = Math.max(...slice)
    const min = Math.min(...slice)
    const stdDev = computeStdDev(slice, avg)
    if (avg >= threshold) {
      matches.push({
        index: i,
        window: windowSize,
        average: Math.round(avg * 100) / 100,
        max,
        min,
        stdDev: Math.round(stdDev * 100) / 100,
      })
    }
  }
  return matches
}
