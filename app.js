// Carrega o .env ANTES de qualquer require que leia process.env (o db/pool lê
// na hora do require). Fica aqui, e não só no server.js, porque os testes
// importam o app.js direto. Chamar config() duas vezes é inofensivo: o dotenv
// não sobrescreve variáveis que já existem.
require("dotenv").config({ quiet: true });

const express = require("express");
const usersRoutes = require("./users/routes/usersRoutes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

// Este arquivo só MONTA o app (sem listen). Quem sobe o servidor é o server.js;
// assim os testes usam o app com supertest sem abrir porta.
const app = express();

// Não anunciar "X-Powered-By: Express" (informação de graça para atacantes).
app.disable("x-powered-by");

// Lê corpo JSON; limite pequeno porque a API só recebe objetos simples.
app.use(express.json({ limit: "10kb" }));

app.use("/api", usersRoutes);

// A ordem importa: 404 depois de todas as rotas, error handler por último.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
