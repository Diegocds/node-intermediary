// Runner de migrations: `npm run migrate`
//
// Regras:
//  - cada arquivo migrations/NNN_nome.sql roda UMA vez (registrado em schema_migrations);
//  - a ordem é a alfabética do nome do arquivo (por isso o prefixo 001_, 002_...);
//  - cada migration roda dentro de uma transação: ou aplica tudo, ou nada.
//
// Também exporta migrate() para os testes de integração prepararem o banco.
require("dotenv").config({ quiet: true });

const fs = require("node:fs");
const path = require("node:path");
const { pool, closePool } = require("./pool");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const MIGRATION_LOCK_ID = 20240001;

async function migrate() {
  // Transação precisa de UM client fixo: com pool.query() cada comando
  // poderia ir para uma conexão diferente e o BEGIN/COMMIT não valeria nada.
  const client = await pool.connect();

  // Trava global (advisory lock) para dois `npm run migrate` simultâneos
  // não aplicarem a mesma migration duas vezes. O número é arbitrário.
  await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name   text        PRIMARY KEY,
        run_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.name));

    const pending = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .filter((file) => !applied.has(file));

    if (pending.length === 0) {
      console.log("Nenhuma migration pendente.");
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`→ aplicando ${file}`);

      try {
        await client.query("BEGIN");
        await client.query(sql); // sem parâmetros, o pg aceita vários comandos num texto só
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (err) {
        // .catch: se o próprio ROLLBACK falhar (conexão caiu), o erro que
        // importa continua sendo o da migration, não o do ROLLBACK.
        await client.query("ROLLBACK").catch(() => {});
        err.message = `${file}: ${err.message}`;
        throw err;
      }
    }

    console.log(`✓ ${pending.length} migration(s) aplicada(s).`);
  } finally {
    // O lock é da SESSÃO (conexão), não da transação: release() só devolve a
    // conexão ao pool, ainda travada. Sem o unlock, o próximo migrate() no
    // mesmo processo (ex.: testes) ficaria esperando para sempre.
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
}

// Só executa quando chamado direto (`node db/migrate.js`), não no require().
if (require.main === module) {
  migrate()
    .catch((err) => {
      console.error("✗ falha na migração:", err.message);
      process.exitCode = 1; // exit code != 0 para scripts/CI perceberem a falha
    })
    .finally(() => closePool());
}

module.exports = { migrate };
