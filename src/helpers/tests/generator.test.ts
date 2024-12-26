import { setupFolderStructure, cleanup } from "./utils";
import * as generator from "../generator";
import * as paths from "../paths";
import * as tsReader from "../tsReader";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { loadModels } from "../../parser/utils";

function getExpectedString(filename: string) {
  return fs.readFileSync(path.join(__dirname, `artifacts/${filename}`), "utf8");
}

function cleanupModelsInMemory() {
  delete mongoose.models.User;
  delete mongoose.connection.collections.users;
}

// these tests are more integration tests than unit - should split them out

describe("generateTypes", () => {
  beforeAll(cleanup);

  afterEach(cleanup);
  afterEach(cleanupModelsInMemory);

  const generatedFilePath = "mtgen-test.ts";

  test("generate file string success", async () => {
    setupFolderStructure("./models", "user", true);
    const modelsPaths = await paths.getModelsPaths("./src/helpers/tests/models/user.ts");
    const cleanupTs = tsReader.registerUserTs("tsconfig.test.json");

    let sourceFile = generator.createSourceFile(generatedFilePath);
    sourceFile = await generator.generateTypes({
      modelsPaths,
      sourceFile,
      noMongoose: false,
      datesAsStrings: false
    });

    const modelTypes = tsReader.getModelTypes(modelsPaths);
    const models = loadModels(modelsPaths);

    generator.replaceModelTypes(sourceFile, modelTypes, models);
    generator.addPopulateHelpers(sourceFile);
    generator.overloadQueryPopulate(sourceFile);

    cleanupTs?.();
    expect(sourceFile.getFullText().trim()).toBe(getExpectedString("user.gen.ts").trim());
  });

  test("generate file string with alt collection names", async () => {
    const modelsPaths = await paths.getModelsPaths("./src/helpers/tests/artifacts/files.ts");
    const cleanupTs = tsReader.registerUserTs("tsconfig.test.json");

    let sourceFile = generator.createSourceFile(generatedFilePath);
    sourceFile = await generator.generateTypes({
      modelsPaths,
      sourceFile,
      noMongoose: false,
      datesAsStrings: false
    });

    const modelTypes = tsReader.getModelTypes(modelsPaths);
    const models = loadModels(modelsPaths);

    generator.replaceModelTypes(sourceFile, modelTypes, models);
    generator.addPopulateHelpers(sourceFile);
    generator.overloadQueryPopulate(sourceFile);
    cleanupTs?.();
    expect(sourceFile.getFullText().trim()).toBe(getExpectedString("files.gen.ts").trim());
  });

  // TODO: the next 2 tests are kinda random and out of place. First one covers all the latest changes
  // related to allowing multiple schemas per model file. Second covers a few niche schema options.
  // Both should be split into unit tests once their code has been modularized
  test("generate different types of model inits", async () => {
    const modelsPaths = await paths.getModelsPaths("./src/helpers/tests/artifacts/device.ts");
    const cleanupTs = tsReader.registerUserTs("tsconfig.test.json");

    let sourceFile = generator.createSourceFile(generatedFilePath);
    sourceFile = await generator.generateTypes({
      modelsPaths,
      sourceFile,
      noMongoose: false,
      datesAsStrings: false
    });

    const modelTypes = tsReader.getModelTypes(modelsPaths);
    const models = loadModels(modelsPaths);

    generator.replaceModelTypes(sourceFile, modelTypes, models);
    generator.addPopulateHelpers(sourceFile);
    generator.overloadQueryPopulate(sourceFile);

    cleanupTs?.();
    expect(sourceFile.getFullText().trim()).toBe(getExpectedString("device.gen.ts").trim());
  });
  test("generate other schema options", async () => {
    const modelsPaths = await paths.getModelsPaths("./src/helpers/tests/artifacts/user2.ts");
    const cleanupTs = tsReader.registerUserTs("tsconfig.test.json");

    let sourceFile = generator.createSourceFile(generatedFilePath);
    sourceFile = await generator.generateTypes({
      modelsPaths,
      sourceFile,
      noMongoose: false,
      datesAsStrings: false
    });

    const modelTypes = tsReader.getModelTypes(modelsPaths);
    const models = loadModels(modelsPaths);
    generator.replaceModelTypes(sourceFile, modelTypes, models);
    generator.addPopulateHelpers(sourceFile);
    generator.overloadQueryPopulate(sourceFile);

    cleanupTs?.();
    expect(sourceFile.getFullText().trim()).toBe(getExpectedString("user2.gen.ts").trim());
  });

  test("generate model with subdocument field named models", async () => {
    const modelsPaths = await paths.getModelsPaths("./src/helpers/tests/artifacts/landingPage.ts");
    const cleanupTs = tsReader.registerUserTs("tsconfig.test.json");

    let sourceFile = generator.createSourceFile(generatedFilePath);
    sourceFile = await generator.generateTypes({
      modelsPaths,
      sourceFile,
      noMongoose: false,
      datesAsStrings: false
    });

    const modelTypes = tsReader.getModelTypes(modelsPaths);
    const models = loadModels(modelsPaths);

    generator.replaceModelTypes(sourceFile, modelTypes, models);
    generator.addPopulateHelpers(sourceFile);
    generator.overloadQueryPopulate(sourceFile);

    cleanupTs?.();
    expect(sourceFile.getFullText().trim()).toBe(getExpectedString("landingPage.gen.ts").trim());
  });
});

describe("sanitizeModelName", () => {
  test("handles basic dot notation", () => {
    expect(generator.sanitizeModelName("Attachment.files")).toBe("AttachmentFiles");
    expect(generator.sanitizeModelName("user.profile")).toBe("UserProfile");
    expect(generator.sanitizeModelName("app.settings.config")).toBe("AppSettingsConfig");
  });

  test("Cleans on invalid characters", () => {
    expect(generator.sanitizeModelName("user-profile")).toBe("UserProfile");
    expect(generator.sanitizeModelName("special@#character")).toBe("SpecialCharacter");
    expect(generator.sanitizeModelName("__internal$$type##")).toBe("__internal$$type");
    expect(generator.sanitizeModelName("$.weird.@.name")).toBe("$WeirdName");
    expect(generator.sanitizeModelName("!invalid!")).toBe("Invalid");
  });

  test("throws on invalid number starts", () => {
    expect(() => generator.sanitizeModelName("2fa.settings")).toThrow(
      "type name cannot start with a number"
    );
    expect(() => generator.sanitizeModelName("123model")).toThrow(
      "type name cannot start with a number"
    );
  });

  test("handles edge cases", () => {
    expect(() => generator.sanitizeModelName("")).toThrow("Type identifier cannot be empty");
    expect(() => generator.sanitizeModelName(" ")).toThrow("Type identifier cannot be empty");
    expect(() => generator.sanitizeModelName(".")).toThrow(
      `Invalid model name: "." - results in invalid TypeScript identifier ""`
    );
    expect(() => generator.sanitizeModelName("...")).toThrow(
      `Invalid model name: "..." - results in invalid TypeScript identifier ""`
    );
    // @ts-expect-error - Testing invalid input
    expect(() => generator.sanitizeModelName(null)).toThrow(
      "Model name must be a string, received: object"
    );
    // @ts-expect-error - Testing invalid input
    expect(() => generator.sanitizeModelName(undefined)).toThrow(
      "Model name must be a string, received: undefined"
    );
    expect(() => generator.sanitizeModelName("string")).toThrow(
      'Invalid model name: "string" - cannot use TypeScript reserved keyword'
    );
    expect(() => generator.sanitizeModelName("123")).toThrow(
      'Invalid model name: "123" - type name cannot start with a number'
    );
  });

  test("preserves camelCase and PascalCase", () => {
    expect(generator.sanitizeModelName("UserProfile.settings")).toBe("UserProfileSettings");
    expect(generator.sanitizeModelName("camelCase.PascalCase")).toBe("CamelCasePascalCase");
    expect(generator.sanitizeModelName("iOS.device")).toBe("IOSDevice");
    expect(generator.sanitizeModelName("APIKey.token")).toBe("APIKeyToken");
  });

  test("handles multiple consecutive separators", () => {
    expect(generator.sanitizeModelName("user...profile")).toBe("UserProfile");
    expect(generator.sanitizeModelName("multiple...dots...here")).toBe("MultipleDotsHere");
  });
});

describe("cleanComment", () => {
  test("removes JSDoc tokens", () => {
    const input = "/** This is a comment */";
    expect(generator.cleanComment(input)).toBe("This is a comment");
  });

  test("handles multi-line comments", () => {
    const input = `/**
     * First line
     * Second line
     */`;
    console.log(generator.cleanComment(input));
    expect(generator.cleanComment(input).trim()).toBe(`First line\nSecond line`);
  });

  test("handles empty comments", () => {
    expect(generator.cleanComment("/** */")).toBe("");
  });
});

describe("convertFuncSignatureToType", () => {
  test("converts query methods", () => {
    const result = generator.convertFuncSignatureToType(
      "(param1: string, param2: number) => void",
      "query",
      "User"
    );
    expect(result).toBe("(this: UserQuery, param1: string, param2: number) => UserQuery");
  });

  test("converts instance methods", () => {
    const result = generator.convertFuncSignatureToType(
      "(name: string) => boolean",
      "methods",
      "User"
    );
    expect(result).toBe("(this: UserDocument, name: string) => boolean");
  });

  test("converts static methods", () => {
    const result = generator.convertFuncSignatureToType("() => Promise<void>", "statics", "User");
    expect(result).toBe("(this: UserModel) => Promise<void>");
  });

  test("handles missing return type", () => {
    const result = generator.convertFuncSignatureToType("(param: string) =>", "methods", "User");
    expect(result).toBe("(this: UserDocument, ...args: any[]) => any");
  });

  test("handles empty parameters", () => {
    const result = generator.convertFuncSignatureToType("() => void", "query", "User");
    expect(result).toBe("(this: UserQuery) => UserQuery");
  });

  test("handles invalid function signature", () => {
    const result = generator.convertFuncSignatureToType("invalid signature", "methods", "User");
    expect(result).toBe("(this: UserDocument, ...args: any[]) => any");
  });

  test("handles existing this parameter", () => {
    const result = generator.convertFuncSignatureToType(
      "(this: any, name: string) => boolean",
      "methods",
      "User"
    );
    expect(result).toBe("(this: UserDocument, name: string) => boolean");
  });

  test("handles complex return types", () => {
    const result = generator.convertFuncSignatureToType(
      "(id: string) => Promise<Record<string, any>>",
      "statics",
      "User"
    );
    expect(result).toBe("(this: UserModel, id: string) => Promise<Record<string, any>>");
  });

  test("sanitizes model name in type", () => {
    const result = generator.convertFuncSignatureToType(
      "(name: string) => boolean",
      "methods",
      "user.profile"
    );
    expect(result).toBe("(this: UserProfileDocument, name: string) => boolean");
  });

  test("handles error cases gracefully", () => {
    const result = generator.convertFuncSignatureToType(
      // @ts-expect-error - Testing invalid input
      null,
      "methods",
      "User"
    );
    expect(result).toBe("(this: UserDocument, ...args: any[]) => any");
  });
});

describe("createSourceFile", () => {
  test("creates new source file", () => {
    const sourceFile = generator.createSourceFile("test.ts");
    expect(sourceFile).toBeDefined();
    expect(sourceFile.getFilePath()).toContain("test.ts");
  });

  test("creates empty file content", () => {
    const sourceFile = generator.createSourceFile("test.ts");
    expect(sourceFile.getFullText()).toBe("");
  });
});

describe("saveFile", () => {
  const testFilePath = "test-save.ts";

  afterEach(() => {
    // Cleanup test file
    if (fs.existsSync(testFilePath)) {
      // this is where the cleanup
      fs.unlinkSync(testFilePath);
    }
  });

  test("saves file successfully", () => {
    const sourceFile = generator.createSourceFile(testFilePath);
    sourceFile.addStatements("const test = 'hello';");

    expect(() => {
      generator.saveFile({ sourceFile, generatedFilePath: testFilePath });
    }).not.toThrow();

    expect(fs.existsSync(testFilePath)).toBe(true); // double check
    fs.unlinkSync(testFilePath);
    expect(fs.existsSync(testFilePath)).toBe(false);
  });

  test("throws error on invalid path", () => {
    const sourceFile = generator.createSourceFile("/invalid/path/test.ts");
    expect(() => {
      generator.saveFile({ sourceFile, generatedFilePath: "/invalid/path/test.ts" });
    }).toThrow();
  });
});
