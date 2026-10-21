async function improvePrompt(prompt) {
  const response = await fetch(
    "https://ollama.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "gpt-oss:20b-cloud",
        messages: [
          {
            role: "system",
            content:
              "Transforme o pedido em um prompt visual detalhado. Responda somente com o prompt, sem introdução."
          },
          { role: "user", content: prompt }
        ],
        stream: false,
        max_tokens: 300
      }),
      signal: AbortSignal.timeout(20000)
    }
  );

  if (!response.ok) throw new Error("Ollama indisponível");

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content?.trim();

  if (!result) throw new Error("Prompt vazio");
  return result.slice(0, 4000);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  const { prompt } = req.body || {};

  if (
    typeof prompt !== "string" ||
    !prompt.trim() ||
    prompt.length > 2000
  ) {
    return res.status(400).json({
      error: "Informe uma descrição de até 2000 caracteres."
    });
  }

  const { OLLAMA_API_KEY, IMAGE_API_URL, IMAGE_API_KEY } =
    process.env;

  if (!OLLAMA_API_KEY || !IMAGE_API_URL || !IMAGE_API_KEY) {
    return res.status(503).json({
      generated: false,
      error: "Configure o Ollama e um provedor de imagens compatível na Vercel."
    });
  }

  let endpoint;
  try {
    endpoint = new URL(IMAGE_API_URL);
    if (endpoint.protocol !== "https:") throw new Error();
  } catch {
    return res.status(503).json({
      generated: false,
      error: "IMAGE_API_URL deve ser uma URL HTTPS válida."
    });
  }

  try {
    const enhancedPrompt = await improvePrompt(prompt.trim());

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${IMAGE_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json, image/*"
      },
      body: JSON.stringify({ prompt: enhancedPrompt }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      console.error("Provedor de imagens:", response.status);
      return res.status(502).json({
        generated: false,
        error: "O provedor não conseguiu gerar a imagem."
      });
    }

    const type = response.headers.get("content-type") || "";

    if (type.startsWith("image/")) {
      const bytes = Buffer.from(await response.arrayBuffer());

      if (bytes.length > 8 * 1024 * 1024) {
        return res.status(502).json({
          generated: false,
          error: "A imagem excede o limite de 8 MB."
        });
      }

      return res.status(200).json({
        generated: true,
        image: `data:${type};base64,${bytes.toString("base64")}`,
        prompt: enhancedPrompt
      });
    }

    const data = await response.json();
    const raw = data.image || data.image_base64;

    if (typeof raw === "string" && raw.length > 0) {
      if (raw.startsWith("data:image/")) {
        return res.status(200).json({
          generated: true,
          image: raw,
          prompt: enhancedPrompt
        });
      }

      if (raw.length > 12 * 1024 * 1024) {
        return res.status(502).json({
          generated: false,
          error: "A resposta da imagem é grande demais."
        });
      }

      return res.status(200).json({
        generated: true,
        image: `data:image/png;base64,${raw}`,
        prompt: enhancedPrompt
      });
    }

    const imageUrl = data.image_url || data.url;

    if (typeof imageUrl === "string") {
      let parsed;
      try {
        parsed = new URL(imageUrl);
      } catch {
        parsed = null;
      }

      if (parsed?.protocol === "https:") {
        return res.status(200).json({
          generated: true,
          imageUrl: parsed.href,
          prompt: enhancedPrompt
        });
      }
    }

    return res.status(502).json({
      generated: false,
      error: "Formato de resposta incompatível com este adaptador."
    });
  } catch (error) {
    console.error("images.js:", error.message);
    return res.status(502).json({
      generated: false,
      error: "Falha ao processar a geração de imagem."
    });
  }
}
