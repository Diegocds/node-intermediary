// Ponto de entrada: `npm start`. Primeira linha carrega o .env.
require("dotenv").config({ quiet: true });

const app = require("./app");
const { closePool } = require("./db/pool");

const port = Number(process.env.PORT) || 3008;
const SHUTDOWN_TIMEOUT_MS = 10000;

const server = app.listen(port, () => {
  console.log(`Servidor iniciado na porta ${port}`);
});

// Graceful shutdown: ao receber Ctrl+C (SIGINT) ou o "pare" do Docker/PM2
// (SIGTERM), paramos de aceitar conexões, deixamos as requisições em
// andamento terminarem e só então fechamos o pool do Postgres.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return; // segundo Ctrl+C não dispara tudo de novo
  shuttingDown = true;
  console.log(`${signal} recebido, encerrando...`);

  // Rede de segurança: se algo travar (requisição longa, banco sem resposta),
  // forçamos a saída. unref() para este timer não segurar o processo vivo sozinho.
  setTimeout(() => {
    console.error("Encerramento demorou demais, forçando saída.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  server.close(async (err) => {
    if (err) console.error("Erro ao fechar o servidor HTTP:", err);
    try {
      await closePool();
      console.log("Encerrado com sucesso.");
      process.exit(err ? 1 : 0);
    } catch (poolErr) {
      console.error("Erro ao fechar o pool do Postgres:", poolErr);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
