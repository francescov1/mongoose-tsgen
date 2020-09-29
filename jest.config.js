module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  preset: "ts-jest",
  extraGlobals: ["Math", "JSON"],
};
