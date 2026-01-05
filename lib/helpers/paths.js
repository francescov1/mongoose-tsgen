import glob from "glob";
import path from "path";
import * as fs from "fs";
export const getConfigFromFile = (configPath) => {
    // if no path provided, check root path for mtgen.config.json file. If doesnt exist, return empty object.
    if (!configPath) {
        const defaultPath = path.join(process.cwd(), "mtgen.config.json");
        if (glob.sync(defaultPath).length === 0)
            return {};
        configPath = defaultPath;
    }
    const { dir, base } = path.parse(configPath);
    if (!base)
        configPath = path.join(dir, "mtgen.config.json");
    else if (base !== "mtgen.config.json") {
        throw new Error(`${base} is not a valid config filename. Ensure to provide a path to a mtgen.config.json file or its parent folder.`);
    }
    const rawConfig = fs.readFileSync(configPath, "utf8");
    return JSON.parse(rawConfig);
};
export const getModelsPaths = (basePath) => {
    let modelsPaths;
    if (basePath && basePath !== "") {
        // base path, only check that path
        const { ext } = path.parse(basePath);
        // if path points to a folder, search for ts files in folder.
        const modelsFolderPath = ext === "" ? path.join(basePath, "*.ts") : basePath;
        modelsPaths = glob.sync(modelsFolderPath, {
            ignore: "**/node_modules/**"
        });
        if (modelsPaths.length === 0) {
            throw new Error(`No model files found found at path "${basePath}".`);
        }
        // Put any index files at the end of the array. This ensures that if an index.ts file re-exports models, the parser
        // picks up the models from the individual files and not the index.ts file so that the tsReader will also pick them up properly
        modelsPaths.sort((_a, b) => (b.endsWith("index.ts") ? -1 : 0));
    }
    else {
        // no base path, recursive search files in a `models/` folder
        const modelsFolderPath = `**/models/!(index).ts`;
        modelsPaths = glob.sync(modelsFolderPath, {
            ignore: "**/node_modules/**"
        });
        if (modelsPaths.length === 0) {
            throw new Error(`Recursive search could not find any model files at "**/models/!(index).ts". Please provide a path to your models folder.`);
        }
    }
    return modelsPaths.map((filename) => path.join(process.cwd(), filename));
};
export const cleanOutputPath = (outputPath) => {
    const { dir, base, ext } = path.parse(outputPath);
    // if `ext` is not empty (meaning outputPath references a file and not a directory) and `ext` != ".ts", means user provided an ivalid filetype (must be a `.ts` file to support typescript interfaces and types)/
    if (ext !== "" && ext !== ".ts") {
        throw new Error("Invalid --ouput argument. Please provide either a folder pah or a Typescript file path.");
    }
    // if extension is empty, means a folder path was provided. Join dir and base to create that path. If filepath was passed, sets to enclosing folder.
    const folderPath = ext === "" ? path.join(dir, base) : dir;
    const genFileName = ext === "" ? "mongoose.gen.ts" : base;
    return path.join(folderPath, genFileName);
};
