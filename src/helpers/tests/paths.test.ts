import { setupFolderStructure, cleanup } from "./utils";
import * as paths from "../paths";
const path = require("path");

// TODO: test path aliases

// ensure folders are cleaned before starting and after each test
beforeEach(cleanup);
afterAll(cleanup);

describe("getModelsPaths", () => {
  test("./dist/models", async () => {
    setupFolderStructure("./dist/models", "user");
    // here the returned value should be an array containing paths of each individual schema
    const expected = [path.join(__dirname, "dist/models/user.ts")];

    let modelsPath = await paths.getModelsPaths();
    expect(modelsPath).toEqual(expected);

    // empty string path
    modelsPath = await paths.getModelsPaths("");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getModelsPaths("./src/helpers/tests/dist/models");
    expect(modelsPath).toEqual(expected);
  });

  test("./models", async () => {
    setupFolderStructure("./models", "user");
    // here the returned value should be an array containing paths of each individual schema
    const expected = [path.join(__dirname, "models/user.ts")];

    let modelsPath = await paths.getModelsPaths();
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getModelsPaths("");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getModelsPaths("./src/helpers/tests/models");
    expect(modelsPath).toEqual(expected);
  });

  // New tests for recursive functionality
  test("recursive search in nested folders", async () => {
    // Setup nested folder structure
    setupFolderStructure("./models", "user");
    setupFolderStructure("./models/level1", "user");
    setupFolderStructure("./models/level1/level2", "device");

    // Test non-recursive (default behavior)
    let modelsPath = await paths.getModelsPaths("./src/helpers/tests/models", false);
    const expectedNonRecursive = [path.join(__dirname, "models/user.ts")];
    expect(modelsPath).toEqual(expectedNonRecursive);

    // Test recursive
    modelsPath = await paths.getModelsPaths("./src/helpers/tests/models", true);
    const expectedRecursive = [
      path.join(__dirname, "models/user.ts"),
      path.join(__dirname, "models/level1/user.ts"),
      path.join(__dirname, "models/level1/level2/device.ts")
    ].sort();

    expect(modelsPath.sort()).toEqual(expectedRecursive);
  });

  test("recursive search with mixed file types", async () => {
    // Setup structure with both .ts and non-.ts files
    setupFolderStructure("./models/nested", "user", true); // includes .gen.ts
    setupFolderStructure("./models/nested/inner", "device");

    const modelsPath = await paths.getModelsPaths("./src/helpers/tests/models", true);
    const expected = [
      path.join(__dirname, "models/nested/user.ts"),
      path.join(__dirname, "models/nested/inner/device.ts")
    ].sort();

    expect(modelsPath.sort()).toEqual(expected);
  });
  test("no models with empty path", async () => {
    expect(() => {
      paths.getModelsPaths("");
    }).toThrow(
      new Error(
        `Recursive search could not find any model files at "**/models/!(index).ts". Please provide a path to your models folder.`
      )
    );
  });

  test("no models with specific path", async () => {
    expect(() => {
      paths.getModelsPaths("./non/existant");
    }).toThrow(new Error(`No model files found found at path "./non/existant".`));
  });
});

describe("cleanOutputPath", () => {
  test("path ending in custom file name", () => {
    const cleaned = paths.cleanOutputPath("/test/path/with/index.d.ts");
    expect(cleaned).toBe(path.normalize("/test/path/with/index.d.ts"));
  });

  test("path ending in javascript file extension error", () => {
    expect(() => {
      paths.cleanOutputPath("/test/path/with/index.js");
    }).toThrow(
      new Error(
        "Invalid --ouput argument. Please provide either a folder pah or a Typescript file path."
      )
    );
  });

  test("path pointing to directory", () => {
    const cleaned = paths.cleanOutputPath("/test/path/to/directory");
    expect(cleaned).toBe(path.normalize("/test/path/to/directory/mongoose.gen.ts"));
  });
});
