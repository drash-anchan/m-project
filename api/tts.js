export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { text, lang = "en" } = req.query;
  if (!text) {
    return res.status(400).json({ error: "text parameter is required" });
  }

  const cleanLang = String(lang || "en").toLowerCase().slice(0, 5);
  const cleanText = String(text).slice(0, 200);

  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(cleanLang)}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;

  try {
    const upstreamRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send("TTS upstream error");
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
