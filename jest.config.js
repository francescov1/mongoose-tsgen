module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  preset: "ts-jest",
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.test.json"
    }
  },
  extraGlobals: ["Math", "JSON"],
};
