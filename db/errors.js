// Traduz erros do PostgreSQL para respostas HTTP.
//
// Todo erro do pg traz `err.code` (SQLSTATE, 5 caracteres) e, quando é
// violação de constraint, `err.constraint` com o NOME dela. Por isso as
// constraints na migration têm nomes explícitos: dá pra dar uma mensagem
// específica sem fazer parsing do texto do erro.
// Lista completa: https://www.postgresql.org/docs/current/errcodes-appendix.html

// Mensagens amigáveis por nome de constraint (ver migrations/001_create_users.sql)
const CONSTRAINT_MESSAGES = {
  users_email_lower_key: "E-mail já cadastrado",
  users_name_not_blank: "Nome não pode ser vazio",
  users_email_format: "E-mail inválido",
};

// Retorna { status, message } se for um erro "do cliente" conhecido,
// ou null (=> o error handler responde 500 e loga).
function mapPgError(err) {
  if (!err || typeof err.code !== "string") return null;

  const byConstraint = err.constraint && CONSTRAINT_MESSAGES[err.constraint];

  switch (err.code) {
    case "23505": // unique_violation
      return { status: 409, message: byConstraint || "Registro duplicado" };
    case "23503": // foreign_key_violation
      return {
        status: 409,
        message: byConstraint || "Registro relacionado não existe ou está em uso",
      };
    case "23502": // not_null_violation
      return { status: 400, message: `Campo obrigatório: ${err.column}` };
    case "23514": // check_violation
      return { status: 400, message: byConstraint || "Valor inválido" };
    case "22P02": // invalid_text_representation (ex.: id "abc" numa coluna integer)
      return { status: 400, message: "Valor em formato inválido" };
    case "22003": // numeric_value_out_of_range (ex.: id maior que um integer)
      return { status: 400, message: "Valor numérico fora do intervalo" };
    default:
      return null;
  }
}

module.exports = { mapPgError };
