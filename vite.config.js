import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function ttsDevPlugin() {
  return {
    name: "tts-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/api/tts", async (req, res) => {
        try {
          const urlObj = new URL(req.url, "http://localhost");
          const lang = urlObj.searchParams.get("lang") || "en";
          const text = urlObj.searchParams.get("text") || "";
          if (!text) {
            res.statusCode = 400;
            res.end("Missing text");
            return;
          }
          const cleanText = text.slice(0, 200);
          const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
          const fetchRes = await fetch(ttsUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Access-Control-Allow-Origin", "*");
          const ab = await fetchRes.arrayBuffer();
          res.end(Buffer.from(ab));
        } catch (e) {
          res.statusCode = 500;
          res.end(e.message);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), ttsDevPlugin()],
});
