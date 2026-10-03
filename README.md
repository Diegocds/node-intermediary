# Node Treinamento Intermediário

API REST de usuários com Express 4 + PostgreSQL (`pg`), CommonJS, Node 22.

## Setup

```bash
npm install
cp .env.example .env   # ajuste as credenciais do Postgres
npm run migrate        # cria as tabelas (roda cada migrations/*.sql uma única vez)
npm run dev            # sobe com --watch em http://localhost:3008
```

## Scripts

| Script            | O que faz                                         |
| ----------------- | ------------------------------------------------- |
| `npm start`       | Sobe o servidor (`server.js`)                     |
| `npm run dev`     | Sobe com `node --watch` (reinicia ao salvar)      |
| `npm run migrate` | Aplica as migrations pendentes                    |
| `npm test`        | Roda os testes (`node --test`)                    |
| `npm run lint`    | ESLint (`lint:fix` corrige o que der)             |
| `npm run format`  | Prettier formata tudo (`format:check` só confere) |

## Testes

- `test/users.routes.test.js`: rotas HTTP com o service mockado. Não precisa de banco.
- `test/users.integration.test.js`: CRUD real contra Postgres. É **pulado** se
  `TEST_DATABASE_URL` não estiver definido. Use um banco separado, a tabela
  `users` é apagada a cada execução:

```bash
createdb node_intermediary_test
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/node_intermediary_test npm test
```

## Endpoints

| Método | Rota             | Corpo                                 | Sucesso                  | Erros         |
| ------ | ---------------- | ------------------------------------- | ------------------------ | ------------- |
| GET    | `/api/users`     | —                                     | 200 lista                |               |
| GET    | `/api/users/:id` | —                                     | 200 usuário              | 400, 404      |
| POST   | `/api/users`     | `name`, `email`, `password`, `phone?` | 201 usuário + `Location` | 400, 409, 413 |
| PUT    | `/api/users/:id` | `name`, `email`, `phone?`             | 200 usuário              | 400, 404, 409 |
| DELETE | `/api/users/:id` | —                                     | 204                      | 400, 404      |

Erros sempre no formato `{ "error": "mensagem", "details"?: [{ "field", "message" }] }`.
Campos desconhecidos no corpo são rejeitados com 400; e-mail duplicado (sem
diferenciar maiúsculas) gera 409. A senha nunca é devolvida pela API.
