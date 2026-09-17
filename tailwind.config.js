/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}", "./src/pages/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#000000",
        muted: "#8e8e8e",
        navtext: "#2e2e2e",
        pilldark: "#28282a",
        signintext: "#c8c8c8",
        trustbg: "#28282a",
        trusttext: "#c4c2c3",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        display: ["BubbledotICG-FinePos", "Geist Pixel Circle", "monospace"],
      },
      boxShadow: {
        nav: "0 4px 14px rgba(0,0,0,0.16)",
        ctaglow:
          "0 0 0 1px rgba(255,255,255,0.15), 0 0 22px rgba(255,255,255,0.32), 0 0 44px rgba(255,255,255,0.12)",
        ctaglowhover:
          "0 0 0 1px rgba(255,255,255,0.22), 0 0 30px rgba(255,255,255,0.45), 0 0 60px rgba(255,255,255,0.18)",
        menu: "0 20px 60px rgba(0,0,0,0.45)",
      },
      keyframes: {
        reveal: {
          from: { opacity: 0, transform: "translateY(22px) scale(0.98)", filter: "blur(6px)" },
          to: { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
        },
        slideDown: {
          from: { opacity: 0, transform: "translateY(-18px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        revealPulse: {
          "0%": { opacity: 0, transform: "translateY(22px) scale(0.98)", filter: "blur(6px)" },
          "70%": { opacity: 1, transform: "translateY(0) scale(1.03)", filter: "blur(0)" },
          "100%": { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
        },
        headlineFade: {
          from: { opacity: 0, transform: "translateY(14px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        overlayIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        menuIn: {
          from: { opacity: 0, transform: "translate(-50%, -10px) scale(0.97)" },
          to: { opacity: 1, transform: "translate(-50%, 0) scale(1)" },
        },
        linkIn: {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        reveal: "reveal 0.85s cubic-bezier(0.22,1,0.36,1) forwards",
        slideDown: "slideDown 0.7s cubic-bezier(0.22,1,0.36,1) both",
        revealPulse: "revealPulse 0.85s cubic-bezier(0.22,1,0.36,1) forwards",
        headlineFade: "headlineFade 0.85s cubic-bezier(0.22,1,0.36,1) forwards",
        overlayIn: "overlayIn 0.28s ease forwards",
        menuIn: "menuIn 0.38s cubic-bezier(0.22,1,0.36,1) forwards",
        linkIn: "linkIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards",
      },
    },
  },
  plugins: [],
};
