import { setupFolderStructure, cleanup } from "./utils";
import * as paths from "../paths";
const path = require("path");

// TODO: test path aliases

// ensure folders are cleaned before starting and after each test
beforeEach(cleanup);
afterAll(cleanup);

describe("getFullModelsPaths", () => {
  test("./dist/models", async () => {
    setupFolderStructure("./dist/models", { index: false, js: true });
    // here the returned value should be an array containing paths of each individual schema
    const expected = [path.join(__dirname, "dist/models/user.js")];

    let modelsPath = await paths.getFullModelsPaths(".", "js");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/", "js");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/dist", "js");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/dist/models", "js");
    expect(modelsPath).toEqual(expected);
  });

  test("./dist/models", async () => {
    setupFolderStructure("./dist/models", { index: false });
    // here the returned value should be an array containing paths of each individual schema
    const expected = [path.join(__dirname, "dist/models/user.ts")];

    let modelsPath = await paths.getFullModelsPaths(".");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/dist");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/dist/models");
    expect(modelsPath).toEqual(expected);
  });

  test("./models", async () => {
    setupFolderStructure("./models", { index: false, js: true });
    // here the returned value should be an array containing paths of each individual schema
    const expected = [path.join(__dirname, "models/user.js")];

    let modelsPath = await paths.getFullModelsPaths(".", "js");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/", "js");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests", "js");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/models", "js");
    expect(modelsPath).toEqual(expected);
  });

  test("./models", async () => {
    setupFolderStructure("./models", { index: false });
    // here the returned value should be an array containing paths of each individual schema
    const expected = [path.join(__dirname, "models/user.ts")];

    let modelsPath = await paths.getFullModelsPaths(".");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/models");
    expect(modelsPath).toEqual(expected);
  });

  test("no models (js)", async () => {
    expect(() => {
      paths.getFullModelsPaths(".", "js");
    }).toThrow(new Error(`No "models/*.js" files found at path "."`));
  });

  test("no models (ts)", async () => {
    expect(() => {
      paths.getFullModelsPaths(".");
    }).toThrow(new Error(`No "models/*.ts" files found at path "."`));
  });
});

describe("cleanOutputPath", () => {
  test("path ending in index.d.ts", () => {
    const cleaned = paths.cleanOutputPath("/test/path/with/index.d.ts");
    expect(cleaned).toBe("/test/path/with");
  });

  test("path ending in file (not index.d.ts)", () => {
    expect(() => {
      paths.cleanOutputPath("/test/path/with/random.ts");
    }).toThrow(new Error("--output parameter must reference a folder path or an index.d.ts file."));

    expect(() => {
      paths.cleanOutputPath("/test/path/with/index.ts");
    }).toThrow(new Error("--output parameter must reference a folder path or an index.d.ts file."));

    expect(() => {
      paths.cleanOutputPath("/test/path/with/index.d.js");
    }).toThrow(new Error("--output parameter must reference a folder path or an index.d.ts file."));
  });

  test("path pointing to directory", () => {
    const cleaned = paths.cleanOutputPath("/test/path/to/directory");
    expect(cleaned).toBe("/test/path/to/directory");
  });
});
