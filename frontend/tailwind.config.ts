import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neon Luxe palette for pachinko atmosphere
        neon: {
          magenta: "#ff2d92",
          cyan: "#00f5ff",
          gold: "#ffd700",
          purple: "#bf5af2",
          green: "#30d158",
        },
        dark: {
          950: "#0a0a0f",
          900: "#0f0f1a",
          800: "#1a1a2e",
          700: "#252542",
          600: "#2f2f52",
          500: "#3d3d66",
          400: "#4d4d7a",
        },
        glass: {
          light: "rgba(255, 255, 255, 0.05)",
          medium: "rgba(255, 255, 255, 0.1)",
          heavy: "rgba(255, 255, 255, 0.15)",
        },
        primary: {
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ff2d92",
          600: "#db2777",
          700: "#be185d",
          800: "#9d174d",
          900: "#831843",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        "neon-magenta": "0 0 20px rgba(255, 45, 146, 0.5), 0 0 40px rgba(255, 45, 146, 0.3)",
        "neon-cyan": "0 0 20px rgba(0, 245, 255, 0.5), 0 0 40px rgba(0, 245, 255, 0.3)",
        "neon-gold": "0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)",
        "glass": "0 8px 32px rgba(0, 0, 0, 0.4)",
        "glass-hover": "0 12px 40px rgba(0, 0, 0, 0.5)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-neon": "linear-gradient(135deg, #ff2d92 0%, #00f5ff 100%)",
        "gradient-dark": "linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)",
        "mesh-pattern": `
          radial-gradient(at 40% 20%, rgba(255, 45, 146, 0.15) 0px, transparent 50%),
          radial-gradient(at 80% 0%, rgba(0, 245, 255, 0.1) 0px, transparent 50%),
          radial-gradient(at 0% 50%, rgba(191, 90, 242, 0.1) 0px, transparent 50%),
          radial-gradient(at 80% 50%, rgba(255, 215, 0, 0.08) 0px, transparent 50%),
          radial-gradient(at 0% 100%, rgba(0, 245, 255, 0.1) 0px, transparent 50%)
        `,
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "slide-in": "slide-in 0.3s ease-out",
        "fade-up": "fade-up 0.4s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "fade-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
