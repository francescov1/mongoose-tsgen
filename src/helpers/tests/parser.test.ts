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

  const genFilePath = "mtgen-test.ts";

  test("generate augmented file string success (js)", async () => {
    setupFolderStructure("./src/models", { js: true, augment: true });
    const modelsPath = await paths.getModelsPaths("", "js");
    const schemas = parser.loadSchemas(modelsPath);

    let sourceFile = parser.createSourceFile(genFilePath);
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

    const schemas = parser.loadSchemas(modelsPaths);

    let sourceFile = parser.createSourceFile(genFilePath);
    sourceFile = await parser.generateTypes({ schemas, isAugmented: true, sourceFile });

    const modelTypes = tsReader.getModelTypes(modelsPaths);
    parser.replaceModelTypes(sourceFile, modelTypes, schemas, true);

    cleanupTs?.();
    expect(sourceFile.getFullText()).toBe(getExpectedInterfaceString(true));
  });

  test("generate unaugmented file string success (ts)", async () => {
    setupFolderStructure("./models");
    const modelsPaths = await paths.getModelsPaths("");
    const cleanupTs = parser.registerUserTs("tsconfig.test.json");

    const schemas = parser.loadSchemas(modelsPaths);
    let sourceFile = parser.createSourceFile(genFilePath);
    sourceFile = await parser.generateTypes({ schemas, isAugmented: false, sourceFile });

    const modelTypes = tsReader.getModelTypes(modelsPaths);
    parser.replaceModelTypes(sourceFile, modelTypes, schemas, false);

    cleanupTs?.();
    expect(sourceFile.getFullText()).toBe(getExpectedInterfaceString(false));
  });
});

describe("getParseKeyFn", () => {
  test.only("handles untyped Array equivalents as `any[]`", () => {
    // see https://mongoosejs.com/docs/schematypes.html#arrays
    const parseKey = parser.getParseKeyFn(false, {
      test1a: { type: [mongoose.Schema.Types.Mixed], default: undefined }
    });

    expect(parseKey("test1a", { type: [mongoose.Schema.Types.Mixed] })).toBe("test1a: any[];\n");
    expect(parseKey("test1b", [mongoose.Schema.Types.Mixed])).toBe("test1b: any[];\n");

    expect(parseKey("test2a", { type: [] })).toBe("test2a: any[];\n");
    expect(parseKey("test2b", [])).toBe("test2b: any[];\n");

    expect(parseKey("test3a", { type: Array })).toBe("test3a: any[];\n");
    expect(parseKey("test3b", Array)).toBe("test3b: any[];\n");

    expect(parseKey("test4a", { type: [{}] })).toBe("test4a: any[];\n");
    expect(parseKey("test4b", [{}])).toBe("test4b: any[];\n");
  });

  test("handles Object equivalents as `any`", () => {
    // see https://mongoosejs.com/docs/schematypes.html#mixed
    const parseKey = parser.getParseKeyFn(false, {});

    expect(parseKey("test1a", { type: mongoose.Schema.Types.Mixed })).toBe("test1a?: any;\n");
    expect(parseKey("test1b", mongoose.Schema.Types.Mixed)).toBe("test1b?: any;\n");
    expect(parseKey("test1c", { type: mongoose.Schema.Types.Mixed, required: true })).toBe(
      "test1c: any;\n"
    );

    expect(parseKey("test2a", { type: mongoose.Mixed })).toBe("test2a?: any;\n");
    expect(parseKey("test2b", mongoose.Mixed)).toBe("test2b?: any;\n");
    expect(parseKey("test2c", { type: mongoose.Mixed, required: true })).toBe("test2c: any;\n");

    expect(parseKey("test3a", { type: {} })).toBe("test3a?: any;\n");
    expect(parseKey("test3b", {})).toBe("test3b?: any;\n");
    expect(parseKey("test3c", { type: {}, required: true })).toBe("test3c: any;\n");

    expect(parseKey("test4a", { type: Object })).toBe("test4a?: any;\n");
    expect(parseKey("test4b", Object)).toBe("test4b?: any;\n");
    expect(parseKey("test4c", { type: Object, required: true })).toBe("test4c: any;\n");
  });
});
