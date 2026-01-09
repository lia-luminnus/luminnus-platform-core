export default function LiveView() {
    return (
        <div className="min-h-screen bg-neon-dark text-white flex">

            {/* Sidebar */}
            <div className="w-72 bg-neon-panel border-r border-neon-blue shadow-neon-blue flex flex-col p-4">
                <h2 className="text-xl font-bold mb-4 text-neon-blue">
                    LIA Controls
                </h2>
                <p className="text-sm opacity-60">Voice, Modes, Tools...</p>
            </div>

            {/* Main Panel */}
            <div className="flex-1 p-6 flex items-center justify-center">
                <div className="w-full max-w-lg text-center">
                    <h1 className="text-4xl font-bold text-neon-green mb-6">
                        LIA Live View
                    </h1>
                    <p className="opacity-80">Interface pronta para integração.</p>
                </div>
            </div>

        </div>
    )
}
