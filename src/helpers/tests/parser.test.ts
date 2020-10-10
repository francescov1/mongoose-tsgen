const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const rimraf = require("rimraf");
import * as parser from "../parser";
const mongoose = require("mongoose");

function setupFolderStructure(relPath: string, { index = true, model = true, typeFile = false, js = false }: { index?: boolean, model?: boolean, typeFile?: boolean, js?: boolean } = {}) {
    const absPath = path.join(__dirname, relPath)
    mkdirp.sync(absPath);

    const extension = js ? "js" : "ts";
    if (index) fs.copyFileSync(path.join(__dirname, `artifacts/index.${extension}`), path.join(absPath, `index.${extension}`));
    if (model) 
    fs.copyFileSync(path.join(__dirname, `artifacts/user.${extension}`), path.join(absPath, `user.${extension}`));
    if (typeFile)
    fs.copyFileSync(path.join(__dirname, 'artifacts/index.d.ts'), path.join(absPath, 'index.d.ts'));
}

function cleanupFolderStructure(relBasePath: string) {
    rimraf.sync(path.join(__dirname, relBasePath));
}

function getExpectedInterfaceString() {
    return fs.readFileSync(path.join(__dirname, `artifacts/index.d.ts`), "utf8");
}

function cleanupModelsInMemory() {
    delete mongoose.models.User;
    delete mongoose.connection.collections.users;
    delete mongoose.modelSchemas.User;
}

const cleanup = () => {
    cleanupFolderStructure("dist");
    cleanupFolderStructure("lib");
    cleanupFolderStructure("models");
    cleanupFolderStructure("src");
}

// TODO: test path aliases, writeOrCreateInterfaceFiles

// ensure folders are cleaned before starting and after each test
beforeEach(cleanup);
afterAll(cleanup);

describe("findModelsPath", () => {
    test("./dist/models/index.js", async () => {
        setupFolderStructure("./dist/models", { js: true })
        const expected = path.join(__dirname, "dist/models/index.js");

        let modelsPath = await parser.findModelsPath(".", true);
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/", true);
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/dist", true);
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/dist/models", true);
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/dist/models/index.js", true);
        expect(modelsPath).toBe(expected);
    })

    test("./dist/models/index.ts", async () => {
        setupFolderStructure("./dist/models")
        const expected = path.join(__dirname, "dist/models/index.ts");

        let modelsPath = await parser.findModelsPath(".");
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/");
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/dist");
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/dist/models");
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/dist/models/index.ts");
        expect(modelsPath).toBe(expected);
    })

    test("./models/index.js", async () => {
        setupFolderStructure("./models", { js: true });
        const expected = path.join(__dirname, "models/index.js");

        let modelsPath = await parser.findModelsPath(".", true);
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/", true);
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests", true);
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/models", true);
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/models/index.js", true);
        expect(modelsPath).toBe(expected);
    })

    test("./models/index.ts", async () => {
        setupFolderStructure("./models");
        const expected = path.join(__dirname, "models/index.ts");

        let modelsPath = await parser.findModelsPath(".");
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/");
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests");
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/models");
        expect(modelsPath).toBe(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/models/index.ts");
        expect(modelsPath).toBe(expected);
    })

    test("./dist/models (no index.js)", async () => {
        setupFolderStructure("./dist/models", { index: false, js: true });
        // here the returned value should be an array containing paths of each individual schema
        const expected = [path.join(__dirname, "dist/models/user.js")]

        let modelsPath = await parser.findModelsPath(".", true);
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/", true);
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/dist", true);
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/dist/models", true);
        expect(modelsPath).toEqual(expected);
    })

    test("./dist/models (no index.ts)", async () => {
        setupFolderStructure("./dist/models", { index: false });
        // here the returned value should be an array containing paths of each individual schema
        const expected = [path.join(__dirname, "dist/models/user.ts")]

        let modelsPath = await parser.findModelsPath(".");
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/");
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/dist");
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/dist/models");
        expect(modelsPath).toEqual(expected);
    })

    test("./models (no index.js)", async () => {
        setupFolderStructure("./models", { index: false, js: true });
        // here the returned value should be an array containing paths of each individual schema
        const expected = [path.join(__dirname, "models/user.js")]

        let modelsPath = await parser.findModelsPath(".", true);
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/", true);
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests", true);
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/models", true);
        expect(modelsPath).toEqual(expected);
    })

    test("./models (no index.ts)", async () => {
        setupFolderStructure("./models", { index: false });
        // here the returned value should be an array containing paths of each individual schema
        const expected = [path.join(__dirname, "models/user.ts")]

        let modelsPath = await parser.findModelsPath(".");
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/");
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests");
        expect(modelsPath).toEqual(expected);

        modelsPath = await parser.findModelsPath("./src/helpers/tests/models");
        expect(modelsPath).toEqual(expected);
    })

    test("no models (js)", async () => {
        expect(() => {
            parser.findModelsPath(".", true)
        }).toThrow(
            new Error(`No "/models" folder found at path "."`)
        );
    })

    test("no models (ts)", async () => {
        expect(() => {
            parser.findModelsPath(".")
        }).toThrow(
            new Error(`No "/models" folder found at path "."`)
        );
    })

    test("multiple index.js files ", async () => {
        setupFolderStructure("./dist/models", { js: true });
        setupFolderStructure("./lib/models", { js: true });

        expect(() => {
            parser.findModelsPath(".", true)
        }).toThrow(
            new Error(`Multiple paths found ending in "models/index.js". Please specify a more specific path argument. Paths found: src/helpers/tests/dist/models/index.js,src/helpers/tests/lib/models/index.js`)
        );
    })

    test("multiple index.ts files ", async () => {
        setupFolderStructure("./dist/models");
        setupFolderStructure("./lib/models");

        expect(() => {
            parser.findModelsPath(".")
        }).toThrow(
            new Error(`Multiple paths found ending in "models/index.ts". Please specify a more specific path argument. Paths found: src/helpers/tests/dist/models/index.ts,src/helpers/tests/lib/models/index.ts`)
        );
    })
});

describe("generateFileString", () => {
    afterEach(cleanupModelsInMemory);

    test("generate file string success (js)", async () => {
        setupFolderStructure("./src/models", { js: true });
        const modelsPath = await parser.findModelsPath(".", true);
        const schemas = parser.loadSchemas(modelsPath);
        const fileString = await parser.generateFileString({ schemas })
        
        expect(fileString).toBe(getExpectedInterfaceString());
    })

    test("generate file string success (ts)", async () => {
        setupFolderStructure("./dist/models");
        const modelsPath = await parser.findModelsPath(".");
        const schemas = parser.loadSchemas(modelsPath);
        const fileString = await parser.generateFileString({ schemas })
        expect(fileString).toBe(getExpectedInterfaceString());
    })
})

describe("cleanOutputPath", () => {
    test("path ending in index.d.ts", () => {
        const cleaned = parser.cleanOutputPath("/test/path/with/index.d.ts")
        expect(cleaned).toBe("/test/path/with")
    })

    test("path ending in file (not index.d.ts)", () => {
        expect(() => {
            parser.cleanOutputPath("/test/path/with/random.ts")
        }).toThrow(new Error("--output parameter must reference a folder path or an index.d.ts file."));

        expect(() => {
            parser.cleanOutputPath("/test/path/with/index.ts")
        }).toThrow(new Error("--output parameter must reference a folder path or an index.d.ts file."));

        expect(() => {
            parser.cleanOutputPath("/test/path/with/index.d.js")
        }).toThrow(new Error("--output parameter must reference a folder path or an index.d.ts file."));
    })

    test("path pointing to directory", () => {
        const cleaned = parser.cleanOutputPath("/test/path/to/directory")
        expect(cleaned).toBe("/test/path/to/directory")
    })
})

