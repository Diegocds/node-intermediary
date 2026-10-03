const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { query } = require("../../db/pool");

const scrypt = promisify(crypto.scrypt);

// Colunas que podem sair da API. password_hash NUNCA entra aqui —
// por isso nada de SELECT * (uma coluna nova "vazaria" sem ninguém perceber).
const PUBLIC_COLUMNS = "id, name, email, phone, created_at, updated_at";

// scrypt é uma função de hash LENTA de propósito (dificulta força bruta).
// O salt aleatório faz duas senhas iguais gerarem hashes diferentes.
// Guardamos "salt:hash" em hex para conseguir verificar a senha depois.
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

// Mesma regra em todo lugar que grava e-mail: sem espaços e minúsculo.
function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : email;
}

class UsersService {
  async findAll() {
    const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY id`);
    return rows;
  }

  // Retorna o usuário ou null (nunca um array).
  async findById(id) {
    const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  // RETURNING devolve a linha recém-criada na mesma ida ao banco.
  async create({ name, email, phone = null, password }) {
    const passwordHash = await hashPassword(password);
    const { rows } = await query(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING ${PUBLIC_COLUMNS}`,
      [name, normalizeEmail(email), phone, passwordHash]
    );
    return rows[0];
  }

  // Atualização completa (semântica de PUT). Retorna null se o id não existe.
  async update(id, { name, email, phone = null }) {
    const { rows } = await query(
      `UPDATE users
          SET name = $1, email = $2, phone = $3, updated_at = now()
        WHERE id = $4
       RETURNING ${PUBLIC_COLUMNS}`,
      [name, normalizeEmail(email), phone, id]
    );
    return rows[0] ?? null;
  }

  // rowCount = quantas linhas o comando afetou; 0 => id não existia.
  async delete(id) {
    const { rowCount } = await query("DELETE FROM users WHERE id = $1", [id]);
    return rowCount > 0;
  }
}

module.exports = new UsersService();
