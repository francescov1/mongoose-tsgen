import fs from "fs";
import path from "path";
import { parseTSConfig } from "../tsReader";

describe("parseTSConfig", () => {
  test("path aliases should be resolved from extended tsconfig.json", () => {
    const testTsConfigPath = "tsconfig.test.json";

    const tsConfigString = fs.readFileSync(testTsConfigPath, "utf8");

    const tsConfig = parseTSConfig(tsConfigString, path.dirname(testTsConfigPath));

    // Check of extended path is present
    expect(tsConfig.compilerOptions.paths["@package-lock-json"][0]).toBe("./package-lock.json");
    // Check if extended path is present and overridden
    expect(tsConfig.compilerOptions.paths["@package-json"][0]).toBe("./package.json");
  });
});
