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
      error: "A integração de dispositivos ainda não está configurada."
    });
  }

  const { deviceId, action } = req.body || {};

  if (
    typeof deviceId !== "string" ||
    !deviceId.trim() ||
    typeof action !== "string" ||
    !action.trim()
  ) {
    return res.status(400).json({
      error: "Informe um 'deviceId' e uma 'action' válidos."
    });
  }

  try {
    // Exemplo de endpoint para comunicação ou IA aplicada a dispositivos
    const endpoint =
      `https://api.cloudflare.com/client/v4/accounts/` +
      `${accountId}/ai/run/@cf/meta/llama-3-8b-instruct`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: `Dispositivo: ${deviceId}, Ação solicitada: ${action}`
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error(
        "Falha no processamento do dispositivo:",
        response.status
      );

      return res.status(502).json({
        error: "A Cloudflare não conseguiu processar o comando do dispositivo."
      });
    }

    const result = data.result?.response || data.result;

    if (!result) {
      return res.status(502).json({
        error: "A API não retornou uma resposta válida para o dispositivo."
      });
    }

    return res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error("Erro na integração de dispositivos:", error.message);

    return res.status(502).json({
      error: "Não foi possível conectar ao serviço de dispositivos."
    });
  }
}
