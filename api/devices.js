export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Use o método POST."
    });
  }

  // Apenas a URL e o Token ficam nas variáveis globais
  const haUrl = process.env.HOME_ASSISTANT_URL;
  const haToken = process.env.HOME_ASSISTANT_TOKEN;

  if (!haUrl || !haToken) {
    return res.status(503).json({
      error: "Configure HOME_ASSISTANT_URL e HOME_ASSISTANT_TOKEN nas variáveis da Vercel."
    });
  }

  // Recebe o domínio, entidade e ação dinamicamente do site
  const { domain, entity_id, action } = req.body || {};

  if (!domain || !entity_id || !action) {
    return res.status(400).json({
      error: "Parâmetros ausentes. Envie 'domain', 'entity_id' e 'action'."
    });
  }

  // Mapeamento das ações recebidas para as rotas do Home Assistant
  const servicesMap = {
    ligar: "turn_on",
    desligar: "turn_off",
    alternar: "toggle",
    turn_on: "turn_on",
    turn_off: "turn_off",
    toggle: "toggle"
  };

  const service = servicesMap[action.toLowerCase()];

  if (!service) {
    return res.status(400).json({
      error: "Ação inválida. Use 'ligar', 'desligar' ou 'alternar'."
    });
  }

  try {
    const baseUrl = haUrl.replace(/\/+$/, "");

    // Rota dinâmica: /api/services/{domain}/{service}
    const response = await fetch(
      `${baseUrl}/api/services/${domain}/${service}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${haToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          entity_id: entity_id
        })
      }
    );

    if (!response.ok) {
      console.error(
        "Home Assistant retornou status:",
        response.status
      );

      return res.status(502).json({
        error: `Não foi possível controlar o dispositivo ${entity_id}.`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Comando '${service}' enviado com sucesso para ${entity_id}.`
    });
  } catch (error) {
    console.error("Erro na integração:", error.message);

    return res.status(502).json({
      error: "Não foi possível conectar ao Home Assistant."
    });
  }
}
fetch('/api/home-assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    domain: 'switch',
    entity_id: 'switch.tomada_cafeteira',
    action: 'desligar'
  })
});
fetch('/api/home-assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    domain: 'automation',
    entity_id: 'automation.modo_cinema',
    action: 'turn_on'
  })
});
