
export default async function handler(req, res) {
  const allowedOrigins = [
    "https://victordeodiro-ship-it.github.io",
    "https://nea-ai.vercel.app"
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "POST, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );
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

  try {
    const { prompt } = req.body || {};

    if (
      typeof prompt !== "string" ||
      prompt.trim().length === 0 ||
      prompt.length > 1000
    ) {
      return res.status(400).json({
        error: "Envie uma descrição de imagem válida."
      });
    }

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: prompt.trim()
        })
      }
    );

    if (!response.ok) {
      const details = await response.text();

      console.error(
        "Erro do Hugging Face:",
        response.status,
        details.slice(0, 500)
      );

      return res.status(502).json({
        error:
          "O serviço de imagens não conseguiu gerar a imagem. Tente novamente mais tarde."
      });
    }

    const imageBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    const contentType =
      response.headers.get("content-type") ||
      "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return res.status(502).json({
        error: "O serviço não retornou uma imagem."
      });
    }

    return res.status(200).json({
      image:
        "data:" +
        contentType +
        ";base64," +
        imageBuffer.toString("base64")
    });
  } catch (error) {
    console.error(
      "Erro na geração de imagem:",
      error.message
    );

    return res.status(500).json({
      error: "Ocorreu um erro ao gerar a imagem."
    });
  }
}
