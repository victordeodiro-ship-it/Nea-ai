async function gerarVideoNaNea() {
  // Pega o texto digitado pelo usuário na caixa de descrição do vídeo
  const promptInput = document.getElementById('promptVideoInput');
  const resultadoDiv = document.getElementById('resultadoVideoContainer');
  
  if (!promptInput || !promptInput.value.trim()) {
    alert("Por favor, descreva a cena para o vídeo.");
    return;
  }

  const promptTexto = promptInput.value.trim();
  resultadoDiv.innerHTML = `<p class="text-xs text-purple-300 animate-pulse">Iniciando a criação do vídeo...</p>`;

  try {
    // 1. INÍCIO DA GERAÇÃO (Envia o prompt para a API da Vercel)
    const response = await fetch('/api/gerar-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptTexto })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível iniciar o vídeo.");
    }

    const operationName = data.operationName;
    resultadoDiv.innerHTML = `<p class="text-xs text-purple-300 animate-pulse">O vídeo está a ser gerado... Acompanhe o andamento.</p>`;

    // 2. CONSULTA DE STATUS (Verifica periodicamente se o vídeo ficou pronto)
    const intervaloVerificacao = setInterval(async () => {
      try {
        const statusResponse = await fetch('/api/gerar-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName })
        });

        const statusData = await statusResponse.json();

        // 3. ENTREGA FINAL OU CONTINUAÇÃO DO PROCESSAMENTO
        if (statusData.status === "completed" && statusData.videoUrl) {
          clearInterval(intervaloVerificacao);
          
          // Exibe o vídeo finalizado no site
          resultadoDiv.innerHTML = `
            <div class="space-y-2">
              <p class="text-xs text-green-400 font-semibold">Vídeo finalizado com sucesso!</p>
              <video controls src="${statusData.videoUrl}" class="w-full rounded-xl border border-white/10 shadow-lg"></video>
            </div>
          `;
        } else if (statusData.error) {
          clearInterval(intervaloVerificacao);
          resultadoDiv.innerHTML = `<p class="text-xs text-red-400">Erro: ${statusData.error}</p>`;
        } else {
          // Continua processando (atualiza a mensagem a cada verificação)
          resultadoDiv.innerHTML = `<p class="text-xs text-purple-300 animate-pulse">A processar cena... por favor, aguarde alguns instantes.</p>`;
        }

      } catch (err) {
        console.error("Erro ao consultar status do vídeo:", err);
      }
    }, 6000); // Verifica a cada 6 segundos

  } catch (error) {
    resultadoDiv.innerHTML = `<p class="text-xs text-red-400">Erro: ${error.message}</p>`;
  }
}
<!-- Exemplo de estrutura HTML para colocar na aba de Vídeos -->
<div class="card-dark rounded-2xl p-4 mb-6">
  <textarea id="promptVideoInput" rows="3" placeholder="Descreva a cena para o seu vídeo..." class="w-full bg-transparent text-xs text-gray-200 placeholder-gray-500 focus:outline-none resize-none mb-4"></textarea>

  <button onclick="gerarVideoNaNea()" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md">
    <i class="fa-solid fa-clapperboard text-xs"></i> Criar vídeo
  </button>
</div>

<!-- Onde o status ou o vídeo finalizado vai aparecer -->
<div id="resultadoVideoContainer" class="card-dark rounded-2xl p-6 text-center">
  <p class="text-xs text-gray-500">Nenhum vídeo criado ainda.</p>
</div>
