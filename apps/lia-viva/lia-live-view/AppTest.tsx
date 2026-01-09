export default function App() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-700 to-pink-500 flex items-center justify-center p-8">
            <div className="text-center space-y-6">
                <h1 className="text-6xl font-bold text-white drop-shadow-2xl animate-pulse">
                    Tailwind ON
                </h1>
                <p className="text-2xl text-white/90 font-semibold">
                    ✅ Configured via Vite Plugin
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                    <div className="bg-neon-green text-black px-6 py-3 rounded-lg shadow-neon-green font-bold">
                        Neon Green
                    </div>
                    <div className="bg-neon-blue text-black px-6 py-3 rounded-lg shadow-neon-blue font-bold">
                        Neon Blue
                    </div>
                    <div className="bg-neon-purple text-white px-6 py-3 rounded-lg shadow-lg font-bold">
                        Neon Purple
                    </div>
                </div>
                <div className="mt-8 p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                    <p className="text-lg text-white font-mono">
                        🎨 Custom theme colors working
                    </p>
                    <p className="text-sm text-white/70 mt-2">
                        Utilities: shadows, gradients, animations
                    </p>
                </div>
            </div>
        </div>
    )
}
