"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { LiveMode } from "@/components/live-mode"
import { ChatMode } from "@/components/chat-mode"
import { MultiModal } from "@/components/multi-modal"
import { DataInsights } from "@/components/data-insights"
import { AvatarStudio } from "@/avatar-studio"
import { CircuitBackground } from "@/components/circuit-background"
import { LIAProvider } from "@/context/LIAContext"

// Modos disponíveis
export type ActiveView = "chat" | "multimodal" | "live" | "data" | "studio"

export default function LiaOS() {
  const [activeView, setActiveView] = useState<ActiveView>("multimodal")
  const [isEmbedded, setIsEmbedded] = useState(false)

  useEffect(() => {
    // Verificar se está em modo embed e qual view abrir
    const params = new URLSearchParams(window.location.search)
    if (params.get("embed") === "1") {
      setIsEmbedded(true)
    }

    const viewParam = params.get("view") as ActiveView
    if (viewParam && ["chat", "multimodal", "live", "data", "studio"].includes(viewParam)) {
      setActiveView(viewParam)
    }


    // Notificar pai que estamos prontos para o handshake
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'LIA_READY' }, '*')
    }

    // Listener para o handshake de autenticação
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'LIA_AUTH_HANDSHAKE') {
        const { accessToken, refreshToken, userId, plan } = event.data
        console.log('[LiaOS] Handshake recebido, salvando tokens e plano:', plan)

        // Salvar no localStorage para persistência na sessão
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          user: { id: userId, app_metadata: { plan } }
        }))

        // Recarregar serviços ou disparar evento global se necessário
        window.dispatchEvent(new Event('lia-auth-updated'))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <LIAProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#0a0e1a]">
        <CircuitBackground />
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        <main className="flex-1 relative overflow-hidden">
          {activeView === "chat" && <ChatMode />}
          {activeView === "multimodal" && <MultiModal />}
          {activeView === "live" && <LiveMode />}
          {activeView === "data" && <DataInsights />}
          {activeView === "studio" && <AvatarStudio />}
        </main>
      </div>
    </LIAProvider>
  )

}


