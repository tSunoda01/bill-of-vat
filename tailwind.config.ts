import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Fallback in case folders move
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        // Light theme colors
        primary: '#1A73E8', // Blue
        secondary: '#185ABC', // Darker Blue
        accent: '#34A853', // Green
        dark: '#1F1F1F', // Text
        sub: '#6D6D6D', // Sub-text
        page: '#F5F7FA', // Background
        card: '#FFFFFF', // Card BG
        border: '#E2E8F0', // Borders
        danger: '#DC2626', // Red for errors/unpaid
        warning: '#F59E0B', // Orange for partial
        
        // Dark theme colors (mapped to CSS variables)
        'dark-primary': '#60A5FA', // Brighter blue for dark mode
        'dark-secondary': '#3B82F6', // Medium blue
        'dark-accent': '#4ADE80', // Brighter green
        'dark-text': '#F3F4F6', // Light text
        'dark-sub': '#9CA3AF', // Sub-text for dark
        'dark-page': '#0F172A', // Very dark background
        'dark-card': '#1E293B', // Dark card
        'dark-border': '#334155', // Dark borders
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      }
    },
  },
  plugins: [],
};
export default config;