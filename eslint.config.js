import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  // TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.tsx", "**/*.spec.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json"
      },
      globals: {
        // Node.js globals
        process: "readonly",
        Buffer: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      // Start with recommended rules
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,

      // Your disabled rules
      camelcase: "off",
      quotes: "off",
      semi: "off",
      "object-curly-spacing": "off",
      indent: "off",
      "no-warning-comments": "off",
      "no-console": "off",
      complexity: "off",
      "brace-style": "off",
      "no-trailing-spaces": "off",
      "no-case-declarations": "off",
      "comma-dangle": "off",
      "no-return-await": "off",
      "no-process-exit": "off",
      "padding-line-between-statements": "off",
      "unicorn/no-process-exit": "off",
      "unicorn/filename-case": "off",
      "unicorn/catch-error-name": "off",
      "unicorn/no-abusive-eslint-disable": "off",
      "unicorn/no-array-for-each": "off",
      "unicorn/prefer-node-protocol": "off",
      "unicorn/better-regex": "off",
      "unicorn/no-useless-undefined": "off",
      "unicorn/prefer-module": "off",
      "unicorn/consistent-function-scoping": "off",
      "unicorn/no-console-spaces": "off",
      "unicorn/prefer-negative-index": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/member-delimiter-style": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  },

  // JavaScript files
  {
    files: ["**/*.js", "**/*.mjs"],
    ...js.configs.recommended
  },

  // Prettier - disables conflicting formatting rules
  prettier,

  // Ignores
  {
    ignores: ["lib/**", "**/artifacts/**", "node_modules/**", "**/*.d.ts", "coverage/**"]
  }
];
