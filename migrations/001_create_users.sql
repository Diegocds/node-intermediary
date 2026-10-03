-- Tabela de usuários.
-- Constraints com NOME explícito: o db/errors.js usa esse nome para
-- devolver mensagens amigáveis ("E-mail já cadastrado" etc.).

CREATE TABLE IF NOT EXISTS users (
  -- IDENTITY é o jeito padrão SQL (Postgres 10+) de auto-incremento;
  -- substitui o antigo SERIAL. ALWAYS impede inserir id "na mão" por engano.
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text        NOT NULL,
  email         text        NOT NULL,
  phone         text,                    -- opcional; text porque telefone não é número (zeros à esquerda, "+55")
  password_hash text        NOT NULL,    -- formato "salt:hash" (scrypt), nunca a senha pura
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- No Postgres, `text` não tem custo extra em relação a varchar(n);
  -- a validação de conteúdo fica nos CHECKs.
  CONSTRAINT users_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT users_email_format   CHECK (email ~ '^[^@\s]+@[^@\s]+$')
);

-- E-mail único SEM diferenciar maiúsculas: "Ana@x.com" e "ana@x.com" colidem.
-- Um índice único sobre a EXPRESSÃO lower(email) resolve sem precisar da
-- extensão citext. Bônus: buscas com WHERE lower(email) = lower($1) usam este índice.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));
