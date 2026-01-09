"use client"

import { useEffect, useState } from "react"

export function MarketChart() {
  const [percentage, setPercentage] = useState(1.24)

  useEffect(() => {
    const interval = setInterval(() => {
      setPercentage((prev) => {
        const change = (Math.random() - 0.5) * 0.1
        return Math.max(0.5, Math.min(2.5, prev + change))
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="glass-panel neon-border rounded-xl p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#e0f7ff] uppercase tracking-wider">Real-Time Market Pulse</h3>
        <span className="px-2 py-1 bg-[rgba(0,255,136,0.1)] border border-[#00ff88] rounded text-xs text-[#00ff88] font-mono">
          LIVE FEED: +{percentage.toFixed(2)}%
        </span>
      </div>

      <div className="h-32 relative">
        <svg viewBox="0 0 280 100" className="w-full h-full">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="rgba(0,243,255,0.1)" strokeWidth="1" />
          ))}

          {/* Cyan line (primary) */}
          <path
            d="M0,70 Q20,60 40,65 T80,50 T120,55 T160,35 T200,40 T240,25 T280,20"
            fill="none"
            stroke="#00f3ff"
            strokeWidth="2"
            className="drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]"
          />

          {/* Magenta line (secondary) */}
          <path
            d="M0,80 Q20,75 40,78 T80,70 T120,72 T160,60 T200,55 T240,45 T280,35"
            fill="none"
            stroke="#ff00ff"
            strokeWidth="2"
            className="drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]"
          />

          {/* Data points */}
          <circle cx="280" cy="20" r="4" fill="#00f3ff" className="animate-pulse" />
          <circle cx="280" cy="35" r="4" fill="#ff00ff" className="animate-pulse" />
        </svg>
      </div>
    </div>
  )
}
