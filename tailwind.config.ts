import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          yellow: {
            DEFAULT: "#eab308",
            hover: "#ca8a04",
            light: "#fef08a",
          },
          green: {
            DEFAULT: "#22c55e",
            dark: "#15803d",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
