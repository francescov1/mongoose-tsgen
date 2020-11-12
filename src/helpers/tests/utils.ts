const rimraf = require("rimraf");
const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');

export const setupFolderStructure = (relPath: string, { index = true, model = true, typeFile = false, js = false }: { index?: boolean, model?: boolean, typeFile?: boolean, js?: boolean } = {}) => {
    const absPath = path.join(__dirname, relPath)
    mkdirp.sync(absPath);

    const extension = js ? "js" : "ts";
    if (index) fs.copyFileSync(path.join(__dirname, `artifacts/index.${extension}`), path.join(absPath, `index.${extension}`));
    if (model) 
    fs.copyFileSync(path.join(__dirname, `artifacts/user.${extension}`), path.join(absPath, `user.${extension}`));
    if (typeFile)
    fs.copyFileSync(path.join(__dirname, 'artifacts/example.index.d.ts'), path.join(absPath, 'index.d.ts'));
}

export const cleanupFolderStructure = (relBasePath: string) => {
    rimraf.sync(path.join(__dirname, relBasePath));
}

export const cleanup = () => {
    cleanupFolderStructure("dist");
    cleanupFolderStructure("lib");
    cleanupFolderStructure("models");
    cleanupFolderStructure("src");
}
