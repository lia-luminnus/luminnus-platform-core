interface HudPanelProps {
  label: string
  value: string
  color?: "cyan" | "purple"
}

export function HudPanel({ label, value, color = "cyan" }: HudPanelProps) {
  const colorClasses = {
    cyan: {
      border: "border-[#00f3ff]",
      text: "text-[#00f3ff]",
      glow: "shadow-[0_0_15px_rgba(0,243,255,0.3)]",
    },
    purple: {
      border: "border-[#bc13fe]",
      text: "text-[#bc13fe]",
      glow: "shadow-[0_0_15px_rgba(188,19,254,0.3)]",
    },
  }

  const colors = colorClasses[color]

  return (
    <div className={`glass-panel ${colors.border} ${colors.glow} rounded-lg px-4 py-3 min-w-[140px]`}>
      <p className="text-xs text-[rgba(224,247,255,0.5)] font-mono uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${colors.text} font-mono mt-1`}>{value}</p>
    </div>
  )
}
