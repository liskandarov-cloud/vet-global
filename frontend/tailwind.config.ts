import type { Config } from 'tailwindcss';

// Design tokens from design_guidelines.json — "Bio-Tech Precision".
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0D9488', foreground: '#FFFFFF' }, // teal-600
        secondary: { DEFAULT: '#F97316', foreground: '#FFFFFF' }, // orange-500
        background: { DEFAULT: '#F8FAFC', paper: '#FFFFFF', dark: '#0F172A' },
        ink: { DEFAULT: '#0F172A', muted: '#475569', subtle: '#94A3B8' },
        line: { DEFAULT: '#E2E8F0', subtle: '#F1F5F9' },
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        body: ['"Public Sans"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        glow: '0 0 40px -10px rgba(13, 148, 136, 0.3)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};

export default config;
