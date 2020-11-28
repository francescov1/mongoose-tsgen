import glob from "glob";
import path from "path";

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
  const customFileName =
    ext === "" ? "mongoose.custom.ts" : genFileName.replace(".ts", ".custom.ts");

  return {
    genFilePath: path.join(folderPath, genFileName),
    customFilePath: path.join(folderPath, customFileName)
  };
};
