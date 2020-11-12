import { setupFolderStructure, cleanup } from "./utils";
import * as parser from "../parser";
import * as paths from "../paths";

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function getExpectedInterfaceString() {
  return fs.readFileSync(
    path.join(__dirname, `artifacts/example.index.d.ts`),
    "utf8"
  );
}

function cleanupModelsInMemory() {
  delete mongoose.models.User;
  delete mongoose.connection.collections.users;
  delete mongoose.modelSchemas.User;
}

// TODO: test writeOrCreateInterfaceFiles

// ensure folders are cleaned before starting and after each test
beforeEach(cleanup);
afterAll(cleanup);

describe("generateFileString", () => {
  afterEach(cleanupModelsInMemory);

  test("generate file string success (js)", async () => {
    setupFolderStructure("./src/models", { js: true });
    const modelsPath = await paths.getFullModelsPaths(".", "js");
    const schemas = parser.loadSchemas(modelsPath);
    const fileString = await parser.generateFileString({ schemas });

    expect(fileString).toBe(getExpectedInterfaceString());
  });

  test("generate file string success (ts)", async () => {
    setupFolderStructure("./dist/models");
    const modelsPath = await paths.getFullModelsPaths(".");
    const schemas = parser.loadSchemas(modelsPath);
    const fileString = await parser.generateFileString({ schemas });
    expect(fileString).toBe(getExpectedInterfaceString());
  });
});

describe("cleanOutputPath", () => {
  test("path ending in index.d.ts", () => {
    const cleaned = parser.cleanOutputPath("/test/path/with/index.d.ts");
    expect(cleaned).toBe("/test/path/with");
  });

  test("path ending in file (not index.d.ts)", () => {
    expect(() => {
      parser.cleanOutputPath("/test/path/with/random.ts");
    }).toThrow(
      new Error(
        "--output parameter must reference a folder path or an index.d.ts file."
      )
    );

    expect(() => {
      parser.cleanOutputPath("/test/path/with/index.ts");
    }).toThrow(
      new Error(
        "--output parameter must reference a folder path or an index.d.ts file."
      )
    );

    expect(() => {
      parser.cleanOutputPath("/test/path/with/index.d.js");
    }).toThrow(
      new Error(
        "--output parameter must reference a folder path or an index.d.ts file."
      )
    );
  });

  test("path pointing to directory", () => {
    const cleaned = parser.cleanOutputPath("/test/path/to/directory");
    expect(cleaned).toBe("/test/path/to/directory");
  });
});
