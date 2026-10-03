// ESLint "flat config" (formato padrão desde o ESLint 9).
// Regras de FORMATAÇÃO ficam com o Prettier: o eslint-config-prettier, por
// último, desliga as regras do ESLint que brigariam com ele.
const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier");

module.exports = [
  { ignores: ["node_modules/", "coverage/"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  prettier,
];
