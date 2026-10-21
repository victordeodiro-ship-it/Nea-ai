// Substitua o trecho de tratamento do resultado por:
const image = data.result?.image || data.result;

if (!image) {
  return res.status(502).json({
    error: "A API não retornou uma imagem."
  });
}

// Se o retorno já for a string base64:
return res.status(200).json({
  image: typeof image === "string" && image.startsWith("data:") 
    ? image 
    : `data:image/jpeg;base64,${image}`
});
