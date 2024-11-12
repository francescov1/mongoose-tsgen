const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const fs = require("fs");
const path = require("path");

export const setupFolderStructure = (
  relPath: string,
  model: "device" | "user" | "",
  includeGen = false
) => {
  const absPath = path.join(__dirname, relPath);
  mkdirp.sync(absPath);

  if (model) {
    fs.copyFileSync(
      path.join(__dirname, `artifacts/${model}.ts`),
      path.join(absPath, `${model}.ts`)
    );
    if (includeGen)
      fs.copyFileSync(
        path.join(__dirname, `artifacts/${model}.gen.ts`),
        path.join(absPath, `${model}.gen.ts`)
      );
  }
};

export const cleanupFolderStructure = (relBasePath: string) => {
  rimraf.sync(path.join(__dirname, relBasePath));
};

export const cleanup = () => {
  cleanupFolderStructure("dist");
  cleanupFolderStructure("lib");
  cleanupFolderStructure("models");
  cleanupFolderStructure("src");
};
