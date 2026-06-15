/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './app/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['DM Mono', 'Cascadia Code', 'Fira Code', 'monospace'],
            },
            colors: {
                bg: '#07090F',
                surface: {
                    DEFAULT: '#0A0F1A',
                    2: '#0E1520',
                    3: '#132030',
                },
                border: {
                    DEFAULT: '#16233A',
                    2: '#1E2E45',
                },
                accent: {
                    DEFAULT: '#FDBA74',
                },
                'text-1': '#E4EDF8',
                'text-2': '#8CAABF',
                'text-3': '#567088',
            },
        },
    },
    plugins: [],
};
