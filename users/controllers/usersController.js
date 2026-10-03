const usersService = require("../services/usersService");
const HttpError = require("../../errors/HttpError");

// Controllers ficam "finos": recebem dados já validados (ver usersValidator),
// chamam o service e escolhem o status HTTP. Sem try/catch: qualquer erro
// sobe pelo asyncHandler até o errorHandler central.
class UsersController {
  async list(req, res) {
    const users = await usersService.findAll();
    res.status(200).json(users);
  }

  async getById(req, res) {
    const user = await usersService.findById(req.params.id);
    if (!user) throw new HttpError(404, "Usuário não encontrado");
    res.status(200).json(user);
  }

  // 201 Created + Location: o padrão REST diz onde o recurso novo mora.
  async create(req, res) {
    const user = await usersService.create(req.body);
    res.location(`${req.baseUrl}/users/${user.id}`).status(201).json(user);
  }

  async update(req, res) {
    const user = await usersService.update(req.params.id, req.body);
    if (!user) throw new HttpError(404, "Usuário não encontrado");
    res.status(200).json(user);
  }

  // 204 No Content: deu certo e não há nada para devolver no corpo.
  async remove(req, res) {
    const deleted = await usersService.delete(req.params.id);
    if (!deleted) throw new HttpError(404, "Usuário não encontrado");
    res.status(204).end();
  }
}

module.exports = new UsersController();
