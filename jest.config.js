module.exports = {
  displayName: "integration",
  testEnvironment: "node",
  // setupFilesAfterEnv: ["<rootDir>/setup.js"],
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  preset: "ts-jest",
  extraGlobals: ["Math", "JSON"],
};
