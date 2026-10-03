// Testes das rotas HTTP SEM banco: o usersService é trocado por dublês
// (mock.method do node:test). Assim testamos validação, status codes e o
// error handler de forma rápida e determinística.
//
// Por que funciona: o service é exportado como UMA instância (singleton), e o
// controller chama `usersService.findById(...)` nessa mesma instância. Trocar o
// método no objeto troca para todo mundo.
//
// O pool do pg é criado no require, mas só abre conexão na primeira query;
// como nenhuma query real acontece, nada fica pendurado. O closePool no after
// é só por garantia.
const { describe, it, afterEach, after, mock } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const usersService = require("../users/services/usersService");
const { closePool } = require("../db/pool");

const user = {
  id: 1,
  name: "Ana",
  email: "ana@example.com",
  phone: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};
const validCreate = { name: "Ana", email: "ana@example.com", password: "segredo123" };
const validUpdate = { name: "Ana Maria", email: "ana@example.com", phone: "+55 11 99999-0000" };

// Falha alto se alguma rota chamar o service quando NÃO deveria (ex.: validação).
function forbidService() {
  for (const name of ["findAll", "findById", "create", "update", "delete"]) {
    mock.method(usersService, name, async () => {
      throw new Error(`usersService.${name} não deveria ter sido chamado`);
    });
  }
}

afterEach(() => mock.restoreAll());
after(() => closePool());

describe("GET /api/users", () => {
  it("200 com a lista", async () => {
    mock.method(usersService, "findAll", async () => [user]);

    const res = await request(app).get("/api/users").expect(200);

    assert.deepEqual(res.body, [user]);
  });
});

describe("GET /api/users/:id", () => {
  it("200 com o usuário e id convertido para number", async () => {
    const findById = mock.method(usersService, "findById", async () => user);

    const res = await request(app).get("/api/users/1").expect(200);

    assert.deepEqual(res.body, user);
    assert.deepEqual(findById.mock.calls[0].arguments, [1]);
  });

  it("404 quando não existe", async () => {
    mock.method(usersService, "findById", async () => null);

    const res = await request(app).get("/api/users/999").expect(404);

    assert.equal(res.body.error, "Usuário não encontrado");
  });

  for (const badId of ["abc", "0", "-1", "1.5", "99999999999999999999"]) {
    it(`400 para id inválido "${badId}" (sem ir ao service)`, async () => {
      forbidService();

      const res = await request(app).get(`/api/users/${badId}`).expect(400);

      assert.equal(res.body.error, "Dados inválidos");
      assert.equal(res.body.details[0].field, "id");
    });
  }
});

describe("POST /api/users", () => {
  it("201 + Location, e o service recebe o corpo limpo", async () => {
    const create = mock.method(usersService, "create", async () => user);

    const res = await request(app)
      .post("/api/users")
      .send({ name: "  Ana  ", email: " ana@example.com ", phone: "  ", password: "segredo123" })
      .expect(201);

    assert.equal(res.headers.location, "/api/users/1");
    assert.deepEqual(res.body, user);
    assert.deepEqual(create.mock.calls[0].arguments[0], {
      name: "Ana",
      email: "ana@example.com",
      phone: null, // telefone só com espaços vira null
      password: "segredo123",
    });
  });

  it("400 listando todos os campos obrigatórios faltando", async () => {
    forbidService();

    const res = await request(app).post("/api/users").send({}).expect(400);

    const fields = res.body.details.map((d) => d.field).sort();
    assert.deepEqual(fields, ["email", "name", "password"]);
  });

  it("400 para e-mail inválido e senha curta", async () => {
    forbidService();

    const res = await request(app)
      .post("/api/users")
      .send({ name: "Ana", email: "ana@", password: "123" })
      .expect(400);

    const fields = res.body.details.map((d) => d.field).sort();
    assert.deepEqual(fields, ["email", "password"]);
  });

  it("400 para campo desconhecido", async () => {
    forbidService();

    const res = await request(app)
      .post("/api/users")
      .send({ ...validCreate, isAdmin: true })
      .expect(400);

    assert.deepEqual(res.body.details, [{ field: "isAdmin", message: "Campo não permitido" }]);
  });

  it("400 quando o corpo não é um objeto", async () => {
    forbidService();

    const res = await request(app).post("/api/users").send([validCreate]).expect(400);

    assert.equal(res.body.details[0].field, "body");
  });

  it("400 para JSON malformado", async () => {
    forbidService();

    const res = await request(app)
      .post("/api/users")
      .set("Content-Type", "application/json")
      .send('{"name": "Ana",')
      .expect(400);

    assert.deepEqual(res.body, { error: "JSON malformado" });
  });

  it("413 para corpo acima do limite", async () => {
    forbidService();

    const res = await request(app)
      .post("/api/users")
      .send({ ...validCreate, name: "x".repeat(20 * 1024) })
      .expect(413);

    assert.equal(res.body.error, "Corpo da requisição muito grande");
  });

  it("409 quando o pg acusa e-mail duplicado (23505)", async () => {
    mock.method(usersService, "create", async () => {
      throw Object.assign(new Error("duplicate key"), {
        code: "23505",
        constraint: "users_email_lower_key",
      });
    });

    const res = await request(app).post("/api/users").send(validCreate).expect(409);

    assert.deepEqual(res.body, { error: "E-mail já cadastrado" });
  });
});

describe("PUT /api/users/:id", () => {
  it("200 com o usuário atualizado", async () => {
    const updated = { ...user, ...validUpdate };
    const update = mock.method(usersService, "update", async () => updated);

    const res = await request(app).put("/api/users/1").send(validUpdate).expect(200);

    assert.deepEqual(res.body, updated);
    assert.deepEqual(update.mock.calls[0].arguments, [1, validUpdate]);
  });

  it("404 quando não existe", async () => {
    mock.method(usersService, "update", async () => null);

    await request(app).put("/api/users/999").send(validUpdate).expect(404);
  });

  it("400 para senha no PUT (não se troca senha por aqui)", async () => {
    forbidService();

    const res = await request(app)
      .put("/api/users/1")
      .send({ ...validUpdate, password: "outrasenha" })
      .expect(400);

    assert.deepEqual(res.body.details, [{ field: "password", message: "Campo não permitido" }]);
  });

  it("400 para id inválido", async () => {
    forbidService();

    await request(app).put("/api/users/abc").send(validUpdate).expect(400);
  });
});

describe("DELETE /api/users/:id", () => {
  it("204 sem corpo", async () => {
    mock.method(usersService, "delete", async () => true);

    const res = await request(app).delete("/api/users/1").expect(204);

    assert.equal(res.text, "");
  });

  it("404 quando não existe", async () => {
    mock.method(usersService, "delete", async () => false);

    await request(app).delete("/api/users/999").expect(404);
  });
});

describe("erros gerais", () => {
  it("404 para rota inexistente", async () => {
    const res = await request(app).get("/api/nada").expect(404);

    assert.deepEqual(res.body, { error: "Rota não encontrada" });
  });

  it("500 genérico, sem vazar mensagem nem stack", async () => {
    mock.method(usersService, "findAll", async () => {
      throw new Error("senha do banco: hunter2");
    });
    // O errorHandler loga o erro; silenciamos para não poluir a saída do teste.
    const consoleError = mock.method(console, "error", () => {});

    const res = await request(app).get("/api/users").expect(500);

    assert.deepEqual(res.body, { error: "Erro interno do servidor" });
    assert.doesNotMatch(res.text, /hunter2|at /);
    assert.equal(consoleError.mock.callCount(), 1); // mas no servidor fica logado
  });

  it("não expõe o header X-Powered-By", async () => {
    const res = await request(app).get("/api/nada");

    assert.equal(res.headers["x-powered-by"], undefined);
  });
});
