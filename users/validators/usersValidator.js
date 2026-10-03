const HttpError = require("../../errors/HttpError");

// Validação "na mão", sem biblioteca, para deixar a ideia explícita:
// cada validador junta TODOS os problemas em `details` (o cliente corrige
// tudo de uma vez) e, se estiver tudo certo, troca req.body por uma versão
// limpa (trim, campos esperados) para o controller confiar no que recebe.

const LIMITS = { name: 100, email: 254, phone: 20, passwordMin: 8, passwordMax: 128 };
// Formato básico: algo@algo.algo, sem espaços. O e-mail "de verdade" só se
// prova enviando uma mensagem; aqui é só para barrar erro de digitação.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isString = (v) => typeof v === "string";
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function fail(details) {
  return new HttpError(400, "Dados inválidos", details);
}

// --- regras por campo: recebem o valor bruto e empurram erros em `details` ---

function checkName(value, details) {
  if (!isString(value) || value.trim() === "") {
    details.push({ field: "name", message: "Obrigatório (texto não vazio)" });
  } else if (value.trim().length > LIMITS.name) {
    details.push({ field: "name", message: `Máximo de ${LIMITS.name} caracteres` });
  }
}

function checkEmail(value, details) {
  if (!isString(value) || value.trim() === "") {
    details.push({ field: "email", message: "Obrigatório" });
  } else if (value.trim().length > LIMITS.email || !EMAIL_REGEX.test(value.trim())) {
    details.push({ field: "email", message: "Formato de e-mail inválido" });
  }
}

function checkPassword(value, details) {
  // Sem trim: espaço é um caractere válido de senha.
  // Máximo existe para ninguém mandar 1 MB e nos fazer rodar scrypt nisso.
  if (!isString(value) || value.length < LIMITS.passwordMin) {
    details.push({ field: "password", message: `Mínimo de ${LIMITS.passwordMin} caracteres` });
  } else if (value.length > LIMITS.passwordMax) {
    details.push({ field: "password", message: `Máximo de ${LIMITS.passwordMax} caracteres` });
  }
}

// Opcional: ausente ou null => sem telefone.
function checkPhone(value, details) {
  if (value === undefined || value === null) return;
  if (!isString(value)) {
    details.push({ field: "phone", message: "Deve ser texto" });
  } else if (value.trim().length > LIMITS.phone) {
    details.push({ field: "phone", message: `Máximo de ${LIMITS.phone} caracteres` });
  }
}

// Campos desconhecidos são REJEITADOS (não só ignorados): um "emial" com
// erro de digitação seria descartado em silêncio e o cliente nem saberia.
function checkUnknownFields(body, allowed, details) {
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) {
      details.push({ field: key, message: "Campo não permitido" });
    }
  }
}

// "" ou só espaços no telefone vira null (mesmo significado de "não tenho").
function cleanPhone(phone) {
  return isString(phone) && phone.trim() !== "" ? phone.trim() : null;
}

// --- middlewares exportados ---

// :id precisa ser inteiro positivo. Barrar aqui evita ir ao banco com "abc".
// Converte para Number para o controller já receber o tipo certo.
function validateIdParam(req, res, next) {
  const { id } = req.params;
  if (!/^\d+$/.test(id) || Number(id) < 1 || !Number.isSafeInteger(Number(id))) {
    return next(fail([{ field: "id", message: "Deve ser um inteiro positivo" }]));
  }
  req.params.id = Number(id);
  next();
}

function validateCreateUser(req, res, next) {
  const body = req.body;
  if (!isPlainObject(body)) return next(fail([{ field: "body", message: "Envie um objeto JSON" }]));

  const details = [];
  checkUnknownFields(body, ["name", "email", "phone", "password"], details);
  checkName(body.name, details);
  checkEmail(body.email, details);
  checkPassword(body.password, details);
  checkPhone(body.phone, details);
  if (details.length) return next(fail(details));

  req.body = {
    name: body.name.trim(),
    email: body.email.trim(),
    phone: cleanPhone(body.phone),
    password: body.password,
  };
  next();
}

// PUT = substituição completa: name e email obrigatórios, phone omitido vira null.
// Senha não se troca por aqui (seria uma rota própria, com a senha atual).
function validateUpdateUser(req, res, next) {
  const body = req.body;
  if (!isPlainObject(body)) return next(fail([{ field: "body", message: "Envie um objeto JSON" }]));

  const details = [];
  checkUnknownFields(body, ["name", "email", "phone"], details);
  checkName(body.name, details);
  checkEmail(body.email, details);
  checkPhone(body.phone, details);
  if (details.length) return next(fail(details));

  req.body = {
    name: body.name.trim(),
    email: body.email.trim(),
    phone: cleanPhone(body.phone),
  };
  next();
}

module.exports = { validateIdParam, validateCreateUser, validateUpdateUser };
