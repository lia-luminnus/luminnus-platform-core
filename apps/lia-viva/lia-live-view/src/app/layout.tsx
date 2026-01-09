import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Orbitron } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" })

export const metadata: Metadata = {
  title: "LIA OS - Luminnus AI System",
  description: "Advanced AI-powered corporate dashboard by Luminnus",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased ${_orbitron.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
