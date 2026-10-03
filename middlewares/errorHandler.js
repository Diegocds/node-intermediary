const HttpError = require("../errors/HttpError");
const { mapPgError } = require("../db/errors");

// Error handler central: o Express reconhece pela assinatura de 4 argumentos
// (err, req, res, next) — os 4 parâmetros são obrigatórios na declaração.
function errorHandler(err, req, res, next) {
  // Se a resposta já começou a ser enviada, só o Express consegue encerrá-la.
  if (res.headersSent) return next(err);

  // 1. Erros que nós mesmos lançamos (validação, 404 de recurso...)
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  // 2. Erros do express.json(): corpo malformado ou grande demais
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON malformado" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Corpo da requisição muito grande" });
  }

  // 3. Erros conhecidos do Postgres (e-mail duplicado, CHECK violado...)
  const pg = mapPgError(err);
  if (pg) return res.status(pg.status).json({ error: pg.message });

  // 4. Qualquer outra coisa é bug ou infra fora do ar: loga tudo no servidor,
  //    mas devolve mensagem genérica (stack trace pro cliente vaza detalhes internos).
  console.error(`[erro] ${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

module.exports = errorHandler;
