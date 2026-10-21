async function gerarImagemNaNea(descricao) {
  const resposta = await fetch('/api/gerar-imagem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: descricao })
  });

  const dados = await resposta.json();

  if (dados.image) {
    // Exibe a imagem gerada na tela!
    document.getElementById('resultadoImagem').src = dados.image;
  } else {
    alert(dados.error);
  }
}
