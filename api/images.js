
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Use o método POST."
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "A chave da OpenAI não está configurada na Vercel."
    });
  }

  try {
    const { prompt } = req.body || {};

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Escreva uma descrição para a imagem."
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        error: "A descrição deve ter no máximo 1000 caracteres."
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-image-1-mini",
          prompt: prompt.trim(),
          size: "1024x1024",
          quality: "low"
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro na API de imagens:", data.error?.code);

      return res.status(response.status).json({
        error: data.error?.message || "Não foi possível gerar a imagem."
      });
    }

    const image = data.data?.[0]?.b64_json;

    if (!image) {
      return res.status(502).json({
        error: "A API não retornou uma imagem."
      });
    }

    return res.status(200).json({
      image: `data:image/png;base64,${image}`
    });
  } catch (error) {
    console.error("Erro ao gerar imagem:", error.message);

    return res.status(500).json({
      error: "Ocorreu um erro ao gerar a imagem."
    });
  }
}
