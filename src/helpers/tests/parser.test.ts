import { setupFolderStructure, cleanup } from "./utils";
import * as parser from "../parser";
import * as paths from "../paths";
import * as tsReader from "../tsReader";

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function getExpectedInterfaceString(isAugmented: boolean) {
  return fs.readFileSync(
    path.join(__dirname, `artifacts/${isAugmented ? "example.index.d.ts" : "mongoose.gen.ts"}`),
    "utf8"
  );
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

describe("generateTypes", () => {
  afterEach(cleanupModelsInMemory);

  test("generate augmented file string success (js)", async () => {
    setupFolderStructure("./src/models", { js: true, augment: true });
    const modelsPath = await paths.getModelsPaths("", "js");
    const schemas = parser.loadSchemas(modelsPath);

    let sourceFile = parser.createSourceFile("tmp");
    sourceFile = await parser.generateTypes({ schemas, isAugmented: true, sourceFile });

    // since we didnt load in typed functions, replace function types in expected string with the defaults.
    let expectedString = getExpectedInterfaceString(true);
    expectedString = expectedString
      .replace("(this: UserDocument) => boolean", "(this: UserDocument, ...args: any[]) => any")
      .replace(
        `(this: UserModel, friendUids: UserDocument["_id"][]) => Promise<UserObject[]>`,
        "(this: UserModel, ...args: any[]) => any"
      )
      .replace("(this: Q) => Q", "(this: Q, ...args: any[]) => Q")
      .replace("name: string", "name: any");

    expect(sourceFile.getFullText()).toBe(expectedString);
  });

  test("generate augmented file string success (ts)", async () => {
    setupFolderStructure("./dist/models", { augment: true });
    const modelsPaths = await paths.getModelsPaths("");
    const cleanupTs = parser.registerUserTs("tsconfig.test.json");
    const functionTypes = tsReader.getFunctionTypes(modelsPaths);
    parser.setFunctionTypes(functionTypes);

    const schemas = parser.loadSchemas(modelsPaths);
    let sourceFile = parser.createSourceFile("tmp");
    sourceFile = await parser.generateTypes({ schemas, isAugmented: true, sourceFile });

    cleanupTs?.();
    expect(sourceFile.getFullText()).toBe(getExpectedInterfaceString(true));
  });

  test("generate unaugmented file string success (ts)", async () => {
    setupFolderStructure("./models");
    const modelsPaths = await paths.getModelsPaths("");
    const cleanupTs = parser.registerUserTs("tsconfig.test.json");
    const functionTypes = tsReader.getFunctionTypes(modelsPaths);
    parser.setFunctionTypes(functionTypes);

    const schemas = parser.loadSchemas(modelsPaths);
    let sourceFile = parser.createSourceFile("tmp");
    sourceFile = await parser.generateTypes({ schemas, isAugmented: false, sourceFile });

    cleanupTs?.();
    expect(sourceFile.getFullText()).toBe(getExpectedInterfaceString(false));
  });
});
