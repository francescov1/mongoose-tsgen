const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const rimraf = require("rimraf");
import * as parser from "../parser";
const mongoose = require("mongoose");

function setupFolderStructure(relPath: string, { index = true, model = true, typeFile = false, customTypeFile = false }: { index?: boolean, model?: boolean, typeFile?: boolean, customTypeFile?: boolean } = {}) {
    const absPath = path.join(__dirname, relPath)
    mkdirp.sync(absPath);

    if (index) fs.copyFileSync(path.join(__dirname, 'artifacts/index.js'), path.join(absPath, 'index.js'));
    if (model) 
    fs.copyFileSync(path.join(__dirname, 'artifacts/user.js'), path.join(absPath, 'user.js'));
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

// ensure no test folders are present
beforeAll(() => {
    cleanupFolderStructure("dist");
    cleanupFolderStructure("lib");
    cleanupFolderStructure("models");
    cleanupFolderStructure("src");
})

describe("findModelsPath", () => {
    test("./dist/models/index.js", async () => {
        setupFolderStructure("./dist/models")
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

        cleanupFolderStructure("dist");
    })

    test("./models/index.js", async () => {
        setupFolderStructure("./models");
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

        cleanupFolderStructure("models");
    })

    test("./dist/models (no index.js)", async () => {
        setupFolderStructure("./dist/models", { index: false });
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

        cleanupFolderStructure("dist");
    })

    test("./models (no index.js)", async () => {
        setupFolderStructure("./models", { index: false });
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

        cleanupFolderStructure("models");
    })

    test("no models", async () => {
        expect(() => {
            parser.findModelsPath(".", true)
        }).toThrow(
            new Error(`No "/models" folder found at path "."`)
        );
    })

    test("multiple index.js files ", async () => {
        setupFolderStructure("./dist/models");
        setupFolderStructure("./lib/models");

        expect(() => {
            parser.findModelsPath(".", true)
        }).toThrow(
            new Error(`Multiple paths found ending in "models/index.js". Please specify a more specific path argument. Paths found: src/helpers/tests/dist/models/index.js,src/helpers/tests/lib/models/index.js`)
        );

        cleanupFolderStructure("dist");
        cleanupFolderStructure("lib");
    })
});

describe("generateFileString", () => {
    test("generate file string success", async () => {
        setupFolderStructure("./dist/models");
        const modelsPath = await parser.findModelsPath(".", true);

        const fileString = await parser.generateFileString({ modelsPath })
        
        expect(fileString).toBe(getExpectedInterfaceString());

        cleanupFolderStructure("dist");
        cleanupModelsInMemory()
    })

    test("generate string file with custom interface success", async () => {
        setupFolderStructure("./lib/models");
        const modelsPath = await parser.findModelsPath(".", true);

        const customInterfaces = `\texport type IUserLean = Pick<IUser, "_id" | "firstName" | "lastName" | "name">;\n\n\texport interface OtherCustomInterface {\n\t\tfoo: string;\n\t\tbar?: number;\n\t}\n`;

        const fileString = await parser.generateFileString({ modelsPath, customInterfaces })
        expect(fileString).toBe(getExpectedInterfaceString(true));

        cleanupFolderStructure("lib");
        cleanupModelsInMemory()
    })
})

describe("loadCustomInterfaces", () => {
    // let expectedInterfaceString: string;
    beforeAll(() => {
        cleanupFolderStructure("src");
        // expectedInterfaceString = fs.readFileSync(path.join(__dirname, "artifacts/index.d.ts"), "utf8");
    })

    test("load custom interface file path missing", () => {
        const interfaceString = parser.loadCustomInterfaces("./src/types/mongoose")
        expect(interfaceString).toBe("");
        cleanupFolderStructure("src");
    })

    test("load custom interface", () => {
        setupFolderStructure("./src/types/mongoose", { model: false, index: false, customTypeFile: true });
        const interfaceString = parser.loadCustomInterfaces("./src/helpers/tests/src/types/mongoose/custom.index.d.ts")
        expect(interfaceString).toBe(`\texport type IUserLean = Pick<IUser, "_id" | "firstName" | "lastName" | "name">;\n\n\texport interface OtherCustomInterface {\n\t\tfoo: string;\n\t\tbar?: number;\n\t}\n`);
        cleanupFolderStructure("src");
    })
})
