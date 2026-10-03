const express = require("express");
const usersController = require("../controllers/usersController");
const asyncHandler = require("../../middlewares/asyncHandler");
const {
  validateIdParam,
  validateCreateUser,
  validateUpdateUser,
} = require("../validators/usersValidator");

const router = express.Router();

// REST: o recurso é "/users" e o MÉTODO HTTP diz a ação
// (nada de /create/user, /delete/user...).
// Ordem em cada rota: validação -> controller (embrulhado no asyncHandler).
router.get("/users", asyncHandler(usersController.list));
router.get("/users/:id", validateIdParam, asyncHandler(usersController.getById));
router.post("/users", validateCreateUser, asyncHandler(usersController.create));
router.put("/users/:id", validateIdParam, validateUpdateUser, asyncHandler(usersController.update));
router.delete("/users/:id", validateIdParam, asyncHandler(usersController.remove));

module.exports = router;
