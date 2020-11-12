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
