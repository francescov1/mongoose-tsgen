const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const rimraf = require("rimraf");
import * as parser from "../parser";
const mongoose = require("mongoose");

function setupFolderStructure(relPath: string, { index = true, model = true, typeFile = false, customTypeFile = false, js = false }: { index?: boolean, model?: boolean, typeFile?: boolean, customTypeFile?: boolean, js?: boolean } = {}) {
    const absPath = path.join(__dirname, relPath)
    mkdirp.sync(absPath);

    const extension = js ? "js" : "ts";
    if (index) fs.copyFileSync(path.join(__dirname, `artifacts/index.${extension}`), path.join(absPath, `index.${extension}`));
    if (model) 
    fs.copyFileSync(path.join(__dirname, `artifacts/user.${extension}`), path.join(absPath, `user.${extension}`));
    if (typeFile)
    fs.copyFileSync(path.join(__dirname, 'artifacts/index.d.ts'), path.join(absPath, 'index.d.ts'));
    if (customTypeFile)
    fs.copyFileSync(path.join(__dirname, 'artifacts/custom.index.d.ts'), path.join(absPath, 'custom.index.d.ts'));
}

function cleanupFolderStructure(relBasePath: string) {
    rimraf.sync(path.join(__dirname, relBasePath));
}

function getExpectedInterfaceString(custom = false) {
    return fs.readFileSync(path.join(__dirname, `artifacts/${custom ? "custom." : ""}index.d.ts`), "utf8");
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

// TODO: split out loadSchemas functionality, this is starting to resemble more integration tests (which should be added at top-most level, using the CLI)

// TODO: each test here uses a different root folder - when the same root folder is re-used, a weird issue occurs where the 
// `city.coordinates` field gets registered as `number` rather than `Types.Array<number>`. Theoretically all resources from prior 
// tests should be getting cleared between each test, so we need to investigate what is not being cleaned up properly so we can address this.
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

    test("generate string file with custom interface success (js)", async () => {
        setupFolderStructure("./models", { js: true });
        const modelsPath = await parser.findModelsPath(".", true);
        const schemas = parser.loadSchemas(modelsPath);

        const customInterfaces = `\texport type IUserLean = Pick<IUser, "_id" | "firstName" | "lastName" | "name">;\n\n\texport interface OtherCustomInterface {\n\t\tfoo: string;\n\t\tbar?: number;\n\t}\n`;

        const fileString = await parser.generateFileString({ schemas, customInterfaces })
        expect(fileString).toBe(getExpectedInterfaceString(true));
    })

    test("generate string file with custom interface success (ts)", async () => {
        setupFolderStructure("./lib/models");
        const modelsPath = await parser.findModelsPath(".");
        const schemas = parser.loadSchemas(modelsPath);

        const customInterfaces = `\texport type IUserLean = Pick<IUser, "_id" | "firstName" | "lastName" | "name">;\n\n\texport interface OtherCustomInterface {\n\t\tfoo: string;\n\t\tbar?: number;\n\t}\n`;

        const fileString = await parser.generateFileString({ schemas, customInterfaces })
        expect(fileString).toBe(getExpectedInterfaceString(true));
    })
})

describe("loadCustomInterfaces", () => {
    // let expectedInterfaceString: string;
    // beforeAll(() => {
    //     expectedInterfaceString = fs.readFileSync(path.join(__dirname, "artifacts/index.d.ts"), "utf8");
    // })

    test("load custom interface file path missing", () => {
        const interfaceString = parser.loadCustomInterfaces("./src/types/mongoose")
        expect(interfaceString).toBe("");
    })

    test("load custom interface (js)", () => {
        setupFolderStructure("./src/types/mongoose", { model: false, index: false, customTypeFile: true, js: true });
        const interfaceString = parser.loadCustomInterfaces("./src/helpers/tests/src/types/mongoose/custom.index.d.ts")
        expect(interfaceString).toBe(`\texport type IUserLean = Pick<IUser, "_id" | "firstName" | "lastName" | "name">;\n\n\texport interface OtherCustomInterface {\n\t\tfoo: string;\n\t\tbar?: number;\n\t}\n`);
    })

    test("load custom interface (ts)", () => {
        setupFolderStructure("./src/types/mongoose", { model: false, index: false, customTypeFile: true });
        const interfaceString = parser.loadCustomInterfaces("./src/helpers/tests/src/types/mongoose/custom.index.d.ts")
        expect(interfaceString).toBe(`\texport type IUserLean = Pick<IUser, "_id" | "firstName" | "lastName" | "name">;\n\n\texport interface OtherCustomInterface {\n\t\tfoo: string;\n\t\tbar?: number;\n\t}\n`);
    })
})
