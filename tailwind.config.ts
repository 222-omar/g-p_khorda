import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: '#f8f7f4',
        primary: {
          DEFAULT: '#01696f',   // deep teal — main brand
          light:   '#0c7f85',   // hover state
          subtle:  '#e0f0f0',   // light bg tints
          muted:   '#cedcd8',   // borders / highlights
        },
      },
      fontFamily: {
        sans: ['var(--font-tajawal)', 'system-ui', 'sans-serif'],
        tajawal: ['var(--font-tajawal)', 'sans-serif'],
        'noto-kufi': ['var(--font-noto-kufi)', 'sans-serif'],
      },
      animation: {
        'scan': 'scan 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
