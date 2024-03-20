const usersService = require("../services/usersService");

class usersController {
  async allUsers(req, res) {
    try {
      const response = await usersService.allUsers();
      res.json(response);
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      res.status(500).json({ error: "Erro ao listar usuários" });
    }
  }

  async getUserById(req, res) {
    const id = req.params.id;
    try {
      const response = await usersService.getUser(id);
      res.json(response);
    } catch (error) {
      console.error("Erro ao listar usuário:", error);
      res.status(500).json({ error: "Erro ao listar usuário" });
    }
  }

  async createUser(req, res) {
    const body = [
      req.body.name,
      req.body.email,
      req.body.phone,
      req.body.password,
    ];
    try {
      await usersService.create(body);
      res.status(201).json({
        message: "Usuário adicionado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao adicionar usuário:", error);
      res.status(500).json({ error: "Erro ao adicionar Usuário" });
    }
  }

  async updateUser(req, res) {
    const id = req.params.id;
    const body = [req.body.name, req.body.email, req.body.phone, id];
    try {
      await usersService.update(body);
      res.json({ message: "Usuário atualizado com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  }

  async deleteUser(req, res) {
    const id = req.params.id;
    try {
      await usersService.delete(id);
      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir exemplo:", error);
      res.status(500).json({ error: "Erro ao excluir usuário" });
    }
  }
}

module.exports = new usersController();
