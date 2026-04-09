import React from "react"

interface MarketSentimentWidgetProps {
  sentimentScore: number // value from 0 to 100
  trend: "Bullish" | "Bearish" | "Neutral"
  dominantToken: string
  totalVolume24h: number
}

const getSentimentColor = (score: number): string => {
  if (score >= 70) return "#4caf50" // green
  if (score >= 40) return "#ff9800" // orange
  return "#f44336" // red
}

export const MarketSentimentWidget: React.FC<MarketSentimentWidgetProps> = ({
  sentimentScore,
  trend,
  dominantToken,
  totalVolume24h,
}) => {
  const trendIcon =
    trend === "Bullish" ? "📈" : trend === "Bearish" ? "📉" : "➖"

  return (
    <div className="p-4 bg-white rounded shadow market-sentiment-widget">
      <h3 className="text-lg font-semibold mb-2">Market Sentiment</h3>
      <div className="flex items-center gap-4 sentiment-info">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full text-white text-lg font-bold score-circle"
          style={{ backgroundColor: getSentimentColor(sentimentScore) }}
        >
          {sentimentScore}%
        </div>
        <ul className="sentiment-details text-sm">
          <li>
            <strong>Trend:</strong> {trendIcon} {trend}
          </li>
          <li>
            <strong>Dominant Token:</strong> {dominantToken}
          </li>
          <li>
            <strong>24h Volume:</strong> ${totalVolume24h.toLocaleString()}
          </li>
        </ul>
      </div>
    </div>
  )
}

export default MarketSentimentWidget
