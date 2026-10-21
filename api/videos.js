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
              "Crie um prompt detalhado para geração de vídeo. Descreva ação, movimento, câmera, cenário e iluminação. Responda somente com o prompt."
          },
          { role: "user", content: prompt }
        ],
        stream: false,
        max_tokens: 400
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
      generated: false,
      error: "Informe uma descrição de até 2000 caracteres."
    });
  }

  const { OLLAMA_API_KEY, VIDEO_API_URL, VIDEO_API_KEY } =
    process.env;

  if (!OLLAMA_API_KEY || !VIDEO_API_URL || !VIDEO_API_KEY) {
    return res.status(503).json({
      generated: false,
      error: "Configure um provedor externo de vídeos na Vercel."
    });
  }

  let endpoint;
  try {
    endpoint = new URL(VIDEO_API_URL);
    if (endpoint.protocol !== "https:") throw new Error();
  } catch {
    return res.status(503).json({
      generated: false,
      error: "VIDEO_API_URL deve ser uma URL HTTPS válida."
    });
  }

  try {
    const enhancedPrompt = await improvePrompt(prompt.trim());

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VIDEO_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ prompt: enhancedPrompt }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      console.error("Provedor de vídeos:", response.status);
      return res.status(502).json({
        generated: false,
        error: "O provedor não conseguiu iniciar a geração."
      });
    }

    const data = await response.json();
    const videoUrl = data.video_url || data.videoUrl;

    if (typeof videoUrl === "string") {
      let parsed;
      try {
        parsed = new URL(videoUrl);
      } catch {
        parsed = null;
      }

      if (parsed?.protocol === "https:") {
        return res.status(200).json({
          generated: true,
          status: "completed",
          videoUrl: parsed.href,
          prompt: enhancedPrompt
        });
      }
    }

    const jobId = data.job_id || data.id;

    if (typeof jobId === "string" && jobId.length <= 200) {
      return res.status(202).json({
        generated: false,
        status: "processing",
        jobId,
        message:
          "A geração foi iniciada. É necessário consultar o status no endpoint próprio do provedor."
      });
    }

    return res.status(502).json({
      generated: false,
      error: "Formato de resposta incompatível com este adaptador."
    });
  } catch (error) {
    console.error("videos.js:", error.message);
    return res.status(502).json({
      generated: false,
      error: "Falha ao processar a geração de vídeo."
    });
  }
}
