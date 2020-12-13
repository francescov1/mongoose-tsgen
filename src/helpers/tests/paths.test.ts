import { setupFolderStructure, cleanup } from "./utils";
import * as paths from "../paths";
const path = require("path");

// TODO: test path aliases

// ensure folders are cleaned before starting and after each test
beforeEach(cleanup);
afterAll(cleanup);

describe("getFullModelsPaths", () => {
  test("./dist/models (ts)", async () => {
    setupFolderStructure("./dist/models", { index: false, js: true });
    // here the returned value should be an array containing paths of each individual schema
    const expected = [path.join(__dirname, "dist/models/user.js")];

    // undefined path
    let modelsPath = await paths.getFullModelsPaths(undefined, "js");
    expect(modelsPath).toEqual(expected);

    // empty string path
    modelsPath = await paths.getFullModelsPaths("", "js");
    expect(modelsPath).toEqual(expected);

    // defined path
    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/dist/models", "js");
    expect(modelsPath).toEqual(expected);
  });

  test("./dist/models (js)", async () => {
    setupFolderStructure("./dist/models", { index: false });
    // here the returned value should be an array containing paths of each individual schema
    const expected = [path.join(__dirname, "dist/models/user.ts")];

    let modelsPath = await paths.getFullModelsPaths(undefined);
    expect(modelsPath).toEqual(expected);

    // empty string path
    modelsPath = await paths.getFullModelsPaths("");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/dist/models");
    expect(modelsPath).toEqual(expected);
  });

  test("./models (js)", async () => {
    setupFolderStructure("./models", { index: false, js: true });
    // here the returned value should be an array containing paths of each individual schema
    const expected = [path.join(__dirname, "models/user.js")];

    let modelsPath = await paths.getFullModelsPaths(undefined, "js");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("", "js");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/models", "js");
    expect(modelsPath).toEqual(expected);
  });

  test("./models (ts)", async () => {
    setupFolderStructure("./models", { index: false });
    // here the returned value should be an array containing paths of each individual schema
    const expected = [path.join(__dirname, "models/user.ts")];

    let modelsPath = await paths.getFullModelsPaths(undefined);
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("");
    expect(modelsPath).toEqual(expected);

    modelsPath = await paths.getFullModelsPaths("./src/helpers/tests/models");
    expect(modelsPath).toEqual(expected);
  });

  test("no models with empty path (js)", async () => {
    // js version
    expect(() => {
      paths.getFullModelsPaths("", "js");
    }).toThrow(
      new Error(
        `Recursive search did not find any "models/*.js" files. Please provide an explicit path to your models folder.`
      )
    );

    // ts version
    expect(() => {
      paths.getFullModelsPaths("");
    }).toThrow(
      new Error(
        `Recursive search did not find any "models/*.ts" files. Please provide an explicit path to your models folder.`
      )
    );
  });

  test("no models with specific path (ts)", async () => {
    // js version
    expect(() => {
      paths.getFullModelsPaths("./non/existant", "js");
    }).toThrow(new Error(`No files found found at path "./non/existant".`));

    // ts version
    expect(() => {
      paths.getFullModelsPaths("./non/existant");
    }).toThrow(new Error(`No files found found at path "./non/existant".`));
  });
});

describe("cleanOutputPath", () => {
  test("path ending in custom file name", () => {
    const cleaned = paths.cleanOutputPath("/test/path/with/index.d.ts");
    expect(cleaned).toBe("/test/path/with/index.d.ts");
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
