const { Pool } = require("pg");

const pool = new Pool({
  user: "didico",
  password: "boquetinho",
});

pool.connect();

module.exports = pool;
