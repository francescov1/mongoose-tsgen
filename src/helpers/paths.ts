import glob from "glob";
import path from "path";
import * as fs from "fs";

export const getConfigFromFile = (configPath?: string): object => {
  // if no path provided, check root path for mtgen.config.json file. If doesnt exist, return empty object.
  if (!configPath) {
    const defaultPath = path.join(process.cwd(), "mtgen.config.json");
    if (glob.sync(defaultPath).length === 0) return {};

    configPath = defaultPath;
  }

  // const userConfig =
  const { dir, base } = path.parse(configPath);

  if (!base) configPath = path.join(dir, "mtgen.config.json");
  else if (base !== "mtgen.config.json")
    throw new Error(
      `${base} is not a valid config filename. Ensure to provide a path to a mtgen.config.json file or its parent folder.`
    );

  // return await fs.readJSON(path.join(this.config.configDir, 'config.json'))
  const rawConfig = fs.readFileSync(configPath, "utf8");
  return JSON.parse(rawConfig);
};

// interface ParsedPath {
//   /**
//    * The root of the path such as '/' or 'c:\'
//    */
//   root: string;
//   /**
//    * The full directory path such as '/home/user/dir' or 'c:\path\dir'
//    */
//   dir: string;
//   /**
//    * The file name including extension (if any) such as 'index.html'
//    */
//   base: string;
//   /**
//    * The file extension (if any) such as '.html'
//    */
//   ext: string;
//   /**
//    * The file name without extension (if any) such as 'index'
//    */
//   name: string;
// }

export const getModelsPaths = (basePath: string, extension: "js" | "ts"): string[] => {
  const { base: basePathEnd } = path.parse(basePath);
  const searchPath =
    basePathEnd === "models" ? `**/!(index).${extension}` : `**/models/!(index).${extension}`;
  const modelsFolderPath = path.join(basePath, searchPath);

  const modelsPaths = glob.sync(modelsFolderPath, {
    ignore: "**/node_modules/**"
  });
  if (modelsPaths.length === 0) {
    throw new Error(`No "models/*.${extension}" files found at path "${basePath}"`);
  }

  return modelsPaths;
};

export const getFullModelsPaths = (basePath: string, extension: "js" | "ts" = "ts"): string[] => {
  const modelsPaths = getModelsPaths(basePath, extension);
  return modelsPaths.map((filename: string) => path.join(process.cwd(), filename));
};

export const cleanOutputPath = (outputPath: string) => {
  const { dir, base, ext } = path.parse(outputPath);

  // if `ext` is not empty (meaning outputPath references a file and not a directory) and `ext` != ".ts", means user provided an ivalid filetype (must be a `.ts` file to support typescript interfaces and types)/
  if (ext !== "" && ext !== ".ts") {
    throw new Error(
      "Invalid --ouput argument. Please provide either a folder pah or a Typescript file path."
    );
  }

  // if extension is empty, means a folder path was provided. Join dir and base to create that path. If filepath was passed, sets to enclosing folder.
  const folderPath = ext === "" ? path.join(dir, base) : dir;
  const genFileName = ext === "" ? "mongoose.gen.ts" : base;

  return path.join(folderPath, genFileName);
};
