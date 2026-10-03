// No Express 4, se um handler async rejeitar, o erro NÃO chega ao error
// handler (vira "unhandledRejection" e a requisição fica pendurada).
// Este wrapper captura a Promise rejeitada e repassa via next(err).
// (No Express 5 isso já é nativo e o wrapper deixa de ser necessário.)
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
