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
    throw new Error(`No "/models" folder found at path "${basePath}"`);
  }

  return modelsPaths;
};

export const getFullModelsPaths = (
  basePath: string,
  extension: "js" | "ts" = "ts"
): string | string[] => {
  const modelsPaths = getModelsPaths(basePath, extension);
  return modelsPaths.map((filename: string) => path.join(process.cwd(), filename));
};

export const cleanOutputPath = (outputPath: string) => {
  const { dir, base, ext } = path.parse(outputPath);

  // if `ext` is not empty (meaning outputPath references a file and not a directory) and `base` != index.d.ts, the path is pointing to a file other than index.d.ts
  if (ext !== "" && base !== "index.d.ts") {
    throw new Error("--output parameter must reference a folder path or an index.d.ts file.");
  }

  // if extension is empty, means `base` is the last folder in the path, so append it to the end
  return ext === "" ? path.join(dir, base) : dir;
};
