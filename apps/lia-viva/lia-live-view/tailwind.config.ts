import type { Config } from 'tailwindcss'

export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                neon: {
                    green: '#39ff14',
                    blue: '#0ff0fc',
                    purple: '#bc13fe',
                    dark: '#0a0a0a',
                    panel: '#111111'
                }
            },
            boxShadow: {
                'neon-green': '0 0 10px #39ff14, 0 0 20px #39ff14',
                'neon-blue': '0 0 10px #0ff0fc, 0 0 20px #0ff0fc',
            },
            fontFamily: {
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
            }
        }
    },
    plugins: [],
} satisfies Config
