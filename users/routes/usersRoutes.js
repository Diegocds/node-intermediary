const express = require("express");
const usersController = require("../controllers/usersController");

const router = express.Router();

router.get("/users", usersController.allUsers);
router.get("/user/:id", usersController.getUserById);
router.post("/create/user", usersController.createUser);
router.put("/update/user/:id", usersController.updateUser);
router.delete("/delete/user/:id", usersController.deleteUser);

module.exports = router;
