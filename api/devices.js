export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  const { OLLAMA_API_KEY } = process.env;

  if (!OLLAMA_API_KEY) {
    return res.status(503).json({
      error: "O Ollama não está configurado."
    });
  }

  const { command } = req.body || {};

  if (
    typeof command !== "string" ||
    !command.trim() ||
    command.length > 1000
  ) {
    return res.status(400).json({
      error: "Informe um comando de até 1000 caracteres."
    });
  }

  try {
    const response = await fetch(
      "https://ollama.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OLLAMA_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || "gpt-oss:20b-cloud",
          messages: [
            {
              role: "system",
              content:
                'Classifique o pedido para controlar uma luz. Responda apenas JSON: {"action":"turn_on"}, {"action":"turn_off"} ou {"action":"unsupported"}. Ligar/acender significa turn_on; desligar/apagar significa turn_off.'
            },
            { role: "user", content: command.trim() }
          ],
          stream: false,
          temperature: 0,
          max_tokens: 80
        }),
        signal: AbortSignal.timeout(15000)
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        error: "Não foi possível interpretar o comando."
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const json = text.match(/\{[\s\S]*\}/)?.[0];

    let decision;
    try {
      decision = JSON.parse(json);
    } catch {
      return res.status(422).json({
        error: "O comando não pôde ser interpretado com segurança."
      });
    }

    if (!["turn_on", "turn_off"].includes(decision.action)) {
      return res.status(400).json({
        error: "Comando não suportado."
      });
    }

    // Não executar ações físicas sem autenticação de usuário
    // e confirmação verificadas no servidor.
    return res.status(501).json({
      ready: false,
      action: decision.action,
      requiresAuthentication: true,
      requiresConfirmation: true,
      message:
        "Comando reconhecido, mas o controle está desativado até a configuração de autenticação e confirmação seguras."
    });
  } catch (error) {
    console.error("devices.js:", error.message);
    return res.status(502).json({
      error: "Falha ao interpretar o comando."
    });
  }
}
