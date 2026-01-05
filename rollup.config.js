import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";

import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "src/index.ts",
  output: {
    file: "lib/index.js",
    format: "es",
    sourcemap: true
  },
  external: [
    // Keep these as external dependencies (don't bundle them)
    "@oclif/core",
    "glob",
    "lodash",
    "mkdirp",
    "pluralize",
    "prettier",
    "resolve",
    "strip-json-comments",
    "ts-morph",
    "ts-node",
    "tsconfig-paths",
    "tslib",
    "mongoose",
    "typescript",
    // Node.js built-ins
    "fs",
    "path",
    "process",
    "util",
    "os",
    "crypto",
    "events",
    "stream",
    "buffer"
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ["node"]
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      sourceMap: true,
      inlineSources: true
    })
  ]
};
