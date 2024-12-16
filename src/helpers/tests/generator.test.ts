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
    // fs.writeFileSync('./src/helpers/tests/artifacts/files.gen.ts', sourceFile.getFullText().trim());
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

describe("sanitizeTypeName", () => {
  test("handles basic dot notation", () => {
    expect(generator.sanitizeTypeName("Attachment.files")).toBe("AttachmentFiles");
    expect(generator.sanitizeTypeName("user.profile")).toBe("UserProfile");
    expect(generator.sanitizeTypeName("app.settings.config")).toBe("AppSettingsConfig");
  });

  test("handles invalid characters", () => {
    expect(generator.sanitizeTypeName("user-profile")).toBe("UserProfile");
    expect(generator.sanitizeTypeName("special@#character")).toBe("SpecialCharacter");
    expect(generator.sanitizeTypeName("__internal$$type##")).toBe("InternalType");
    expect(generator.sanitizeTypeName("$.weird.@.name")).toBe("WeirdName");
  });

  test("handles numbers", () => {
    expect(generator.sanitizeTypeName("2fa.settings")).toBe("T2faSettings");
    expect(generator.sanitizeTypeName("user.2fa")).toBe("UserT2fa");
    expect(generator.sanitizeTypeName("123model")).toBe("T123model");
    expect(generator.sanitizeTypeName("model123.type")).toBe("Model123Type");
  });

  test("handles edge cases", () => {
    expect(generator.sanitizeTypeName("")).toBe("UnknownType");
    expect(generator.sanitizeTypeName(" ")).toBe("UnknownType");
    expect(generator.sanitizeTypeName(".")).toBe("UnknownType");
    expect(generator.sanitizeTypeName("...")).toBe("UnknownType");
    // @ts-expect-error - Testing invalid input
    expect(generator.sanitizeTypeName(null)).toBe("UnknownType");
    // @ts-expect-error - Testing invalid input
    expect(generator.sanitizeTypeName(undefined)).toBe("UnknownType");
  });

  test("preserves camelCase and PascalCase", () => {
    expect(generator.sanitizeTypeName("UserProfile.settings")).toBe("UserProfileSettings");
    expect(generator.sanitizeTypeName("camelCase.PascalCase")).toBe("CamelCasePascalCase");
    expect(generator.sanitizeTypeName("iOS.device")).toBe("IOSDevice");
    expect(generator.sanitizeTypeName("APIKey.token")).toBe("APIKeyToken");
  });

  test("handles multiple consecutive separators", () => {
    expect(generator.sanitizeTypeName("user...profile")).toBe("UserProfile");
    expect(generator.sanitizeTypeName("multiple...dots...here")).toBe("MultipleDotsHere");
    expect(generator.sanitizeTypeName("mixed.-._.separators")).toBe("MixedSeparators");
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
    expect(result).toBe("(this: UserDocument) => any");
  });

  test("handles empty parameters", () => {
    const result = generator.convertFuncSignatureToType("() => void", "query", "User");
    expect(result).toBe("(this: UserQuery) => UserQuery");
  });

  test("handles invalid function signature", () => {
    const result = generator.convertFuncSignatureToType("invalid signature", "methods", "User");
    expect(result).toBe(`(this: UserDocument) => any`);
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
    expect(result).toBe("(this: UserDocument) => any");
  });
});

describe("parseFunctions", () => {
  test("parses method functions", () => {
    const funcs = {
      validatePassword: () => {},
      updateProfile: () => {},
      initializeTimestamps: () => {} // should be ignored
    };
    const result = generator.parseFunctions(funcs, "User", "methods");
    expect(result).toContain("validatePassword:");
    expect(result).toContain("updateProfile:");
    expect(result).not.toContain("initializeTimestamps:");
  });

  test("parses static functions", () => {
    const funcs = {
      findByEmail: () => {},
      createWithDefaults: () => {}
    };
    const result = generator.parseFunctions(funcs, "User", "statics");
    expect(result).toContain("findByEmail:");
    expect(result).toContain("createWithDefaults:");
  });

  test("parses query functions", () => {
    const funcs = {
      byAge: () => {},
      active: () => {}
    };
    const result = generator.parseFunctions(funcs, "User", "query");
    expect(result).toContain("byAge:");
    expect(result).toContain("active:");
  });

  test("handles empty function object", () => {
    const result = generator.parseFunctions({}, "User", "methods");
    expect(result).toBe("");
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
      fs.unlinkSync(testFilePath);
    }
  });

  test("saves file successfully", () => {
    const sourceFile = generator.createSourceFile(testFilePath);
    sourceFile.addStatements("const test = 'hello';");

    expect(() => {
      generator.saveFile({ sourceFile, generatedFilePath: testFilePath });
    }).not.toThrow();

    expect(fs.existsSync(testFilePath)).toBe(true);
  });

  test("throws error on invalid path", () => {
    const sourceFile = generator.createSourceFile("/invalid/path/test.ts");
    expect(() => {
      generator.saveFile({ sourceFile, generatedFilePath: "/invalid/path/test.ts" });
    }).toThrow();
  });
});

test("sanitizeTypeName handles model names with dots", () => {
  expect(generator.sanitizeTypeName("Landing.Page")).toBe("LandingPage");
  expect(generator.sanitizeTypeName("User.Profile.Settings")).toBe("UserProfileSettings");
  expect(generator.sanitizeTypeName("api.v1.User")).toBe("ApiV1User");
});
