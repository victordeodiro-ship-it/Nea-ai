
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  const apiKey = process.env.OLLAMA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "A chave do Ollama não está configurada no servidor."
    });
  }

  const contentLength = Number(
    req.headers["content-length"] || 0
  );

  if (contentLength > 20000) {
    return res.status(413).json({
      error: "Mensagem muito grande. Envie um texto menor."
    });
  }

  try {
    const { messages, memory } = req.body || {};

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 20
    ) {
      return res.status(400).json({
        error: "Envie entre 1 e 20 mensagens."
      });
    }

    for (const message of messages) {
      if (
        !message ||
        typeof message.content !== "string" ||
        message.content.length > 4000
      ) {
        return res.status(400).json({
          error: "Uma das mensagens é inválida ou muito grande."
        });
      }
    }

    const systemPrompt =
      'Você é Nea, uma IA pessoal inteligente, acolhedora, espontânea e criativa. Chame o usuário de "meu criador" naturalmente, sem exagerar. Sua frase especial é: "Uma ideia puxa outra. Vamos descobrir até onde a nossa pode chegar."' +
      (typeof memory === "string"
        ? "\nMemória opcional do usuário: " +
          memory.slice(0, 2000)
        : "");

    const response = await fetch(
      "https://ollama.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model:
            process.env.OLLAMA_MODEL ||
            "gpt-oss:20b-cloud",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...messages.slice(-20).map((m) => ({
              role:
                m.role === "assistant"
                  ? "assistant"
                  : "user",
              content: m.content.slice(0, 4000)
            }))
          ],
          temperature: 0.85,
          max_tokens: 700,
          stream: false
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Erro da API Ollama:",
        response.status,
        data.error?.message || data.error || "Erro desconhecido"
      );

      return res.status(502).json({
        error: "Não foi possível obter uma resposta da IA."
      });
    }

    return res.status(200).json({
      answer:
        data.choices?.[0]?.message?.content ||
        "Não consegui gerar uma resposta desta vez."
    });
  } catch (error) {
    console.error(
      "Erro no backend:",
      error.message
    );

    return res.status(500).json({
      error: "Ocorreu um erro ao conversar com a Nea."
    });
  }
}
