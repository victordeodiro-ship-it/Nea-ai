
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Use o método POST."
    });
  }

  const haUrl = process.env.HOME_ASSISTANT_URL;
  const haToken = process.env.HOME_ASSISTANT_TOKEN;
  const lightEntity = process.env.HOME_ASSISTANT_LIGHT_ENTITY;

  if (!haUrl || !haToken || !lightEntity) {
    return res.status(503).json({
      error: "Configure o Home Assistant nas variáveis da Vercel."
    });
  }

  const { action } = req.body || {};

  const services = {
    ligar: "turn_on",
    desligar: "turn_off"
  };

  if (!Object.hasOwn(services, action)) {
    return res.status(400).json({
      error: "Ação inválida. Use ligar ou desligar."
    });
  }

  try {
    const baseUrl = haUrl.replace(/\/+$/, "");

    const response = await fetch(
      `${baseUrl}/api/services/light/${services[action]}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${haToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          entity_id: lightEntity
        })
      }
    );

    if (!response.ok) {
      console.error(
        "Home Assistant retornou status:",
        response.status
      );

      return res.status(502).json({
        error: "Não foi possível controlar a luz."
      });
    }

    return res.status(200).json({
      success: true,
      message: action === "ligar"
        ? "Comando de ligar enviado."
        : "Comando de desligar enviado."
    });
  } catch (error) {
    console.error("Erro na integração:", error.message);

    return res.status(502).json({
      error: "Não foi possível conectar ao Home Assistant."
    });
  }
}
