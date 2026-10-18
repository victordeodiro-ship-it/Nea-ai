
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "A chave da OpenAI não está configurada no servidor."
    });
  }

  try {
    const { messages, memory } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Mensagens inválidas."
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                'Você é Nea, uma IA pessoal inteligente, acolhedora, espontânea e criativa. Chame o usuário de "meu criador" naturalmente, sem exagerar. Sua frase especial é: "Uma ideia puxa outra. Vamos descobrir até onde a nossa pode chegar." ' +
                (typeof memory === "string"
                  ? "\nMemória opcional do usuário: " +
                    memory.slice(0, 2000)
                  : "")
            },
            ...messages.slice(-20).map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: String(m.content || "").slice(0, 10000)
            }))
          ],
          temperature: 0.85,
          max_tokens: 700
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro da API OpenAI:", data.error?.message);
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
    console.error("Erro no backend:", error.message);
    return res.status(500).json({
      error: "Ocorreu um erro ao conversar com a Nea."
    });
  }
}
