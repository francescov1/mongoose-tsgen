import { setupFolderStructure, cleanup } from "./utils";
import * as parser from "../parser";
import * as paths from "../paths";
import * as tsReader from "../tsReader";

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function getExpectedInterfaceString() {
  return fs.readFileSync(path.join(__dirname, `artifacts/example.index.d.ts`), "utf8");
}

function cleanupModelsInMemory() {
  delete mongoose.models.User;
  delete mongoose.connection.collections.users;
  delete mongoose.modelSchemas.User;
}

// TODO: test writeOrCreateInterfaceFiles

// these tests are more integration tests than unit - should split them out

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

    // since we didnt load in typed functions, replace function types in expected string with 'Function'
    let expectedString = getExpectedInterfaceString();
    expectedString = expectedString
      .replace("(this: any) => boolean", "Function")
      .replace(`(this: any, friendUids: IUser["_id"][]) => Promise<any>`, "Function");
    expect(fileString).toBe(expectedString);
  });

  test("generate file string success (ts)", async () => {
    setupFolderStructure("./dist/models");
    const modelsPaths = await paths.getFullModelsPaths(".");
    const cleanupTs = parser.registerUserTs("tsconfig.test.json");
    const functionTypes = tsReader.getFunctionTypes(modelsPaths);
    parser.setFunctionTypes(functionTypes);

    const schemas = parser.loadSchemas(modelsPaths);
    const fileString = await parser.generateFileString({ schemas });
    cleanupTs?.();
    expect(fileString).toBe(getExpectedInterfaceString());
  });
});
