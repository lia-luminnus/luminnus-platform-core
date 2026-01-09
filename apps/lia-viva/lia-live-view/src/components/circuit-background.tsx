"use client"

export function CircuitBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1525] to-[#0a0e1a]" />

      {/* Circuit pattern overlay */}
      <div className="absolute inset-0 circuit-pattern opacity-30" />

      {/* Horizontal circuit lines - Left side */}
      <svg className="absolute left-0 top-0 h-full w-48 opacity-40" viewBox="0 0 200 800" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f3ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00f3ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[100, 200, 300, 400, 500, 600, 700].map((y, i) => (
          <g key={i}>
            <path
              d={`M0,${y} L${60 + (i % 3) * 20},${y} L${80 + (i % 3) * 20},${y + 20} L150,${y + 20}`}
              stroke="url(#lineGradient)"
              strokeWidth="1"
              fill="none"
            />
            <circle cx={60 + (i % 3) * 20} cy={y} r="3" fill="#00f3ff" opacity="0.6" />
          </g>
        ))}
      </svg>

      {/* Horizontal circuit lines - Right side */}
      <svg className="absolute right-0 top-0 h-full w-48 opacity-40" viewBox="0 0 200 800" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradientRight" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#bc13fe" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#bc13fe" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[150, 250, 350, 450, 550, 650].map((y, i) => (
          <g key={i}>
            <path
              d={`M200,${y} L${140 - (i % 3) * 20},${y} L${120 - (i % 3) * 20},${y - 20} L50,${y - 20}`}
              stroke="url(#lineGradientRight)"
              strokeWidth="1"
              fill="none"
            />
            <circle cx={140 - (i % 3) * 20} cy={y} r="3" fill="#bc13fe" opacity="0.6" />
          </g>
        ))}
      </svg>

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00f3ff] rounded-full blur-[150px] opacity-5" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#bc13fe] rounded-full blur-[150px] opacity-5" />
    </div>
  )
}
