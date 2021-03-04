const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const fs = require("fs");
const path = require("path");

export const setupFolderStructure = (
  relPath: string,
  {
    index = true,
    model = true,
    typeFile = false,
    js = false,
    augment = false
  }: { index?: boolean; model?: boolean; typeFile?: boolean; js?: boolean; augment?: boolean } = {}
) => {
  const absPath = path.join(__dirname, relPath);
  mkdirp.sync(absPath);

  const extension = js ? "js" : "ts";
  if (index)
    fs.copyFileSync(
      path.join(__dirname, `artifacts/index.${extension}`),
      path.join(absPath, `index.${extension}`)
    );
  if (model)
    fs.copyFileSync(
      path.join(__dirname, `artifacts/user.${extension}`),
      path.join(absPath, `user.${extension}`)
    );
  if (typeFile) {
    const filename = augment ? "augmentedUser.gen.ts" : "user.gen.ts";
    console.log("augment: ", augment);
    console.log("filename: ", filename);
    fs.copyFileSync(path.join(__dirname, `artifacts/${filename}`), path.join(absPath, filename));
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
