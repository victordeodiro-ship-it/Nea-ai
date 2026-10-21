
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Use o método POST."
    });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return res.status(503).json({
      error: "A integração de imagens ainda não está configurada."
    });
  }

  const { prompt } = req.body || {};

  if (
    typeof prompt !== "string" ||
    !prompt.trim() ||
    prompt.length > 2048
  ) {
    return res.status(400).json({
      error: "Informe uma descrição de até 2048 caracteres."
    });
  }

  try {
    const endpoint =
      `https://api.cloudflare.com/client/v4/accounts/` +
      `${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        steps: 4
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error(
        "Falha na geração de imagem:",
        response.status
      );

      return res.status(502).json({
        error: "A Cloudflare não conseguiu gerar a imagem."
      });
    }

    const image = data.result?.image;

    if (!image) {
      return res.status(502).json({
        error: "A API não retornou uma imagem."
      });
    }

    return res.status(200).json({
      image: `data:image/jpeg;base64,${image}`
    });
  } catch (error) {
    console.error("Erro na integração de imagens:", error.message);

    return res.status(502).json({
      error: "Não foi possível conectar ao serviço de imagens."
    });
  }
}
