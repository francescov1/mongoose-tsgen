import { parseTSConfig } from "../tsReader";

describe("parseTSConfig", () => {
  test("path aliases should be resolved from extended tsconfig.json", () => {
    const testTsConfigPath = "tsconfig.test.json";

    const tsConfig = parseTSConfig(testTsConfigPath);

    // Check of extended path is present
    expect(tsConfig.compilerOptions.paths["@package-lock-json"][0]).toBe("./package-lock.json");
    // Check if extended path is present and overridden
    expect(tsConfig.compilerOptions.paths["@package-json"][0]).toBe("./package.json");
  });
});
