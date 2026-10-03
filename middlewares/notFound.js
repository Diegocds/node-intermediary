// Chega aqui qualquer requisição que nenhuma rota atendeu.
// Precisa ser registrado DEPOIS de todas as rotas no app.js.
function notFound(req, res) {
  res.status(404).json({ error: "Rota não encontrada" });
}

module.exports = notFound;
