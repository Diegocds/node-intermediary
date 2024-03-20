const express = require("express");
const usersRoutes = require("./users/routes/usersRoutes");

const app = express();
const port = 3008;

// Middleware para o corpo da solicitação JSON
app.use(express.json());

// Usar as rotas definidas
app.use("/api", usersRoutes);

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor iniciado na porta ${port}`);
});
