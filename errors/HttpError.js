// Erro "esperado" que já sabe qual status HTTP deve virar.
// Qualquer camada pode lançar `new HttpError(404, "Usuário não encontrado")`
// e o error handler central monta a resposta — ninguém precisa de try/catch.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details; // opcional: lista de problemas (ex.: validação)
  }
}

module.exports = HttpError;
