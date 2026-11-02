import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b12",
        panel: "#14141d",
        line: "#26263a",
        accent: "#e94560",
        ember: "#ffb347",
      },
    },
  },
  plugins: [],
};

export default config;
