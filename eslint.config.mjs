import globals from "globals";
import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},
  {languageOptions: { 
    globals: {
      ...globals.browser, // Keep existing browser globals
      process: 'readonly', // Add 'process' as a global variable
    },
  }},
  pluginJs.configs.recommended,
];