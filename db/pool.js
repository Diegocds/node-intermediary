const { Pool } = require("pg");

// Configuração 100% via variáveis de ambiente (nada de senha no código).
//
// Duas formas de apontar para o banco:
//  1. DATABASE_URL=postgres://user:senha@host:5432/banco  (comum em deploy)
//  2. PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE
//     -> o driver `pg` lê essas variáveis SOZINHO quando a opção não é
//        passada no construtor, então não precisamos repeti-las aqui.
//
// Quem carrega o .env (dotenv) é o ponto de entrada (app.js / db/migrate.js),
// antes de dar require neste arquivo.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // undefined => usa as PG*
  max: Number(process.env.PG_POOL_MAX) || 10, // conexões simultâneas no máximo
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000, // fecha conexão ociosa
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 5000, // não trava pra sempre se o banco cair
});

// Um client OCIOSO do pool pode cair (ex.: banco reiniciou). Sem este listener,
// o 'error' não tratado derrubaria o processo inteiro do Node.
pool.on("error", (err) => {
  console.error("[pg] erro inesperado em client ocioso:", err.message);
});

// Atalho para o caso comum: uma query avulsa (o pool pega e devolve o client).
// Sempre passe valores em `params` ($1, $2...) — nunca concatene na string.
function query(text, params) {
  return pool.query(text, params);
}

// Para o graceful shutdown: espera as queries em andamento e fecha as conexões.
function closePool() {
  return pool.end();
}

module.exports = { pool, query, closePool };
