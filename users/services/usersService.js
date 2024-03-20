const pool = require("../../db/pool");

class usersService {
  async allUsers() {
    const { rows } = await pool.query("SELECT * FROM users");

    return rows;
  }

  async getUser(id) {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);

    return rows;
  }

  async create(body) {
    await pool.query(
      "INSERT INTO users (name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING *",
      body
    );
  }

  async update(body) {
    await pool.query(
      "UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4",
      body
    );
  }

  async delete(id) {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}

module.exports = new usersService();
