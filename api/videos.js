
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Use o método POST."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY não está configurada na Vercel."
    });
  }

  const { prompt, operationName } = req.body || {};

  try {
    // Consultar o andamento de um vídeo já solicitado.
    if (operationName) {
      const statusResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
        {
          headers: {
            "x-goog-api-key": apiKey
          }
        }
      );

      const statusData = await statusResponse.json();

      if (!statusResponse.ok) {
        return res.status(502).json({
          error: "Não foi possível consultar o vídeo."
        });
      }

      if (!statusData.done) {
        return res.status(202).json({
          status: "processing",
          operationName
        });
      }

      if (statusData.error) {
        return res.status(502).json({
          error: "A geração do vídeo falhou."
        });
      }

      const videoUri =
        statusData.response?.generateVideoResponse
          ?.generatedSamples?.[0]?.video?.uri;

      if (!videoUri) {
        return res.status(502).json({
          error: "A operação terminou sem retornar um vídeo."
        });
      }

      return res.status(200).json({
        status: "completed",
        videoUrl: videoUri
      });
    }

    // Iniciar uma nova geração.
    if (
      typeof prompt !== "string" ||
      !prompt.trim() ||
      prompt.length > 1000
    ) {
      return res.status(400).json({
        error: "Informe uma descrição de até 1000 caracteres."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: prompt.trim()
            }
          ],
          parameters: {
            aspectRatio: "16:9"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Erro da API de vídeo:",
        data.error?.code
      );

      return res.status(502).json({
        error:
          data.error?.message ||
          "Não foi possível iniciar a geração do vídeo."
      });
    }

    if (!data.name) {
      return res.status(502).json({
        error: "A API não retornou o identificador da operação."
      });
    }

    return res.status(202).json({
      status: "processing",
      operationName: data.name,
      message: "O vídeo está sendo gerado."
    });
  } catch (error) {
    console.error("Erro ao gerar vídeo:", error.message);

    return res.status(500).json({
      error: "Ocorreu um erro ao solicitar o vídeo."
    });
  }
}
