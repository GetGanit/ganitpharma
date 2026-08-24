import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#FACC15',
          'yellow-hover': '#EAB308',
          green: '#22C55E',
        }
      }
    },
  },
  plugins: [],
};
export default config;
