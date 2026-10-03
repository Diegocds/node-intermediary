// Testes de integração: API + Postgres de verdade (CRUD completo).
//
// Como rodar:
//   1. Crie um banco SÓ para testes (a tabela users é APAGADA a cada execução):
//        createdb node_intermediary_test
//   2. Aponte para ele no .env ou na linha de comando:
//        TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/node_intermediary_test npm test
//
// Sem TEST_DATABASE_URL os testes deste arquivo são PULADOS (aparecem como
// "skipped"). De propósito NÃO usamos o DATABASE_URL de desenvolvimento como
// fallback: um TRUNCATE no banco errado apagaria seus dados.
require("dotenv").config({ quiet: true });

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
// O db/pool lê DATABASE_URL no require, então isto precisa vir ANTES dele.
if (TEST_DATABASE_URL) process.env.DATABASE_URL = TEST_DATABASE_URL;

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { query, closePool } = require("../db/pool");
const { migrate } = require("../db/migrate");

const skip = TEST_DATABASE_URL ? false : "TEST_DATABASE_URL não definido";

after(() => closePool());

describe("users (integração com Postgres)", { skip }, () => {
  before(async () => {
    await migrate();
    await query("TRUNCATE users RESTART IDENTITY");
  });

  // Os testes abaixo rodam em ordem e compartilham o usuário criado.
  let created;

  it("POST cria (201 + Location) e não devolve senha/hash", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Ana", email: "Ana@Example.com", password: "segredo123" })
      .expect(201);

    created = res.body;
    assert.equal(res.headers.location, `/api/users/${created.id}`);
    assert.equal(created.email, "ana@example.com"); // normalizado pelo service
    assert.equal(created.phone, null);
    assert.ok(!("password" in created) && !("password_hash" in created));
  });

  it("guarda a senha como hash scrypt (salt:hash), nunca em texto puro", async () => {
    const { rows } = await query("SELECT password_hash FROM users WHERE id = $1", [created.id]);

    assert.match(rows[0].password_hash, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("POST com e-mail repetido (maiúsculas diferentes) => 409", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Outra", email: "ANA@example.com", password: "segredo123" })
      .expect(409);

    assert.equal(res.body.error, "E-mail já cadastrado");
  });

  it("GET lista e GET por id", async () => {
    const list = await request(app).get("/api/users").expect(200);
    assert.equal(list.body.length, 1);
    assert.ok(!("password_hash" in list.body[0]));

    const one = await request(app).get(`/api/users/${created.id}`).expect(200);
    assert.deepEqual(one.body, created);
  });

  it("PUT atualiza e mexe no updated_at", async () => {
    const res = await request(app)
      .put(`/api/users/${created.id}`)
      .send({ name: "Ana Maria", email: "ana@example.com", phone: "+55 11 90000-0000" })
      .expect(200);

    assert.equal(res.body.name, "Ana Maria");
    assert.equal(res.body.phone, "+55 11 90000-0000");
    assert.ok(new Date(res.body.updated_at) >= new Date(created.updated_at));
  });

  it("PUT com e-mail de outro usuário => 409", async () => {
    await request(app)
      .post("/api/users")
      .send({ name: "Bia", email: "bia@example.com", password: "segredo123" })
      .expect(201);

    await request(app)
      .put(`/api/users/${created.id}`)
      .send({ name: "Ana", email: "BIA@example.com" })
      .expect(409);
  });

  it("id fora do intervalo de integer => 400 (não 500)", async () => {
    await request(app).get("/api/users/99999999999").expect(400);
  });

  it("DELETE => 204, depois GET/PUT/DELETE => 404", async () => {
    await request(app).delete(`/api/users/${created.id}`).expect(204);

    await request(app).get(`/api/users/${created.id}`).expect(404);
    await request(app)
      .put(`/api/users/${created.id}`)
      .send({ name: "X", email: "x@example.com" })
      .expect(404);
    await request(app).delete(`/api/users/${created.id}`).expect(404);
  });

  it("migrate() é idempotente (rodar de novo não falha nem trava)", async () => {
    await migrate();
  });
});
