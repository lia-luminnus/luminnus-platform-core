"use client"

import { useState } from "react"
import { Shield, User, Zap } from "lucide-react"

const settingsSections = [
  {
    title: "Profile Settings",
    icon: User,
    items: [
      { label: "Display Name", type: "input", value: "Admin User" },
      { label: "Email Notifications", type: "toggle", enabled: true },
      { label: "Language", type: "select", value: "English" },
    ],
  },
  {
    title: "AI Configuration",
    icon: Zap,
    items: [
      { label: "Response Speed", type: "toggle", enabled: true },
      { label: "Voice Synthesis", type: "toggle", enabled: false },
      { label: "Auto-Analysis", type: "toggle", enabled: true },
    ],
  },
  {
    title: "Security",
    icon: Shield,
    items: [
      { label: "Two-Factor Auth", type: "toggle", enabled: true },
      { label: "Session Timeout", type: "select", value: "30 minutes" },
      { label: "API Key", type: "input", value: "••••••••••••" },
    ],
  },
  {
    title: "LIA Governance",
    icon: Shield, // Reutilizando ícone de Shield ou outro
    items: [
      { label: "Global Update", type: "action", actionLabel: "Broadcast Update" },
    ],
  },
]

export function Settings() {
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({})

  const handleToggle = (key: string, initial: boolean) => {
    setToggleStates((prev) => ({
      ...prev,
      [key]: prev[key] !== undefined ? !prev[key] : !initial,
    }))
  }

  return (
    <div className="h-full w-full overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#00f3ff] mb-2">Settings</h2>
        <p className="text-[rgba(224,247,255,0.6)]">Configure your LIA OS preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6 max-w-3xl">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="glass-panel neon-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-[rgba(0,243,255,0.2)]">
              <section.icon className="w-5 h-5 text-[#00f3ff]" />
              <h3 className="font-bold text-[#e0f7ff]">{section.title}</h3>
            </div>
            <div className="p-4 space-y-4">
              {section.items.map((item, itemIndex) => {
                const toggleKey = `${sectionIndex}-${itemIndex}`
                const isEnabled =
                  toggleStates[toggleKey] !== undefined
                    ? toggleStates[toggleKey]
                    : (item as any).type === "toggle" && (item as any).enabled

                return (
                  <div key={itemIndex} className="flex items-center justify-between py-2">
                    <span className="text-[rgba(224,247,255,0.8)]">{item.label}</span>
                    {item.type === "toggle" && (
                      <button
                        onClick={() => handleToggle(toggleKey, (item as any).enabled!)}
                        className={`w-12 h-6 rounded-full transition-all duration-300 ${(isEnabled as boolean)
                          ? "bg-[rgba(0,243,255,0.3)] border border-[#00f3ff]"
                          : "bg-[rgba(224,247,255,0.1)] border border-[rgba(224,247,255,0.2)]"
                          }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full transition-all duration-300 ${(isEnabled as boolean)
                            ? "bg-[#00f3ff] translate-x-6 shadow-[0_0_10px_#00f3ff]"
                            : "bg-[rgba(224,247,255,0.4)] translate-x-0.5"
                            }`}
                        />
                      </button>
                    )}
                    {item.type === "input" && (
                      <input
                        type="text"
                        defaultValue={(item as any).value}
                        className="px-4 py-2 bg-[rgba(10,20,40,0.6)] border border-[rgba(0,243,255,0.3)] rounded-lg text-[#e0f7ff] text-sm w-48 focus:outline-none focus:border-[#00f3ff]"
                      />
                    )}
                    {item.type === "select" && (
                      <select className="px-4 py-2 bg-[rgba(10,20,40,0.6)] border border-[rgba(0,243,255,0.3)] rounded-lg text-[#e0f7ff] text-sm w-48 focus:outline-none focus:border-[#00f3ff]">
                        <option>{(item as any).value}</option>
                      </select>
                    )}
                    {item.type === "action" && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/system/update', { method: 'POST' });
                            if (res.ok) alert('🚀 Broadcast de atualização enviado com sucesso!');
                            else alert('❌ Falha ao enviar broadcast.');
                          } catch (e) {
                            alert('❌ Erro ao conectar com o servidor.');
                          }
                        }}
                        className="px-4 py-2 bg-[rgba(0,243,255,0.1)] border border-[#00f3ff] text-[#00f3ff] rounded-lg text-sm hover:bg-[rgba(0,243,255,0.2)] transition-all font-bold"
                      >
                        {(item as any).actionLabel || "Executar"}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
