
import { InferenceClient } from "@huggingface/inference";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const allowedOrigins = [
    "https://victordeodiro-ship-it.github.io",
    "https://nea-ai.vercel.app"
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") {
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).end();
    }
    return res.status(204).end();
  }

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      error: "Origem não autorizada."
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  const token = process.env.HF_TOKEN;

  if (!token) {
    return res.status(500).json({
      error: "HF_TOKEN não está configurado na Vercel."
    });
  }

  const { prompt } = req.body || {};

  if (
    typeof prompt !== "string" ||
    !prompt.trim() ||
    prompt.length > 1000
  ) {
    return res.status(400).json({
      error: "Envie uma descrição de imagem válida."
    });
  }

  try {
    const client = new InferenceClient(token);

    const image = await client.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      provider: "auto",
      inputs: prompt.trim()
    });

    const bytes = Buffer.from(await image.arrayBuffer());

    if (bytes.length > 8 * 1024 * 1024) {
      return res.status(502).json({
        error: "A imagem excede o limite de 8 MB."
      });
    }

    const contentType = image.type || "image/png";

    if (!contentType.startsWith("image/")) {
      return res.status(502).json({
        error: "O serviço não retornou uma imagem válida."
      });
    }

    return res.status(200).json({
      image: `data:${contentType};base64,${bytes.toString("base64")}`
    });
  } catch (error) {
    console.error("Erro na geração de imagem:", error.message);

    return res.status(502).json({
      error: "A geração falhou. Verifique o acesso ao modelo e os créditos do Hugging Face."
    });
  }
}
