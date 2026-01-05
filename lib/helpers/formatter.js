import fs from "fs";
import prettier from "prettier";
// I removed ESLINT usage since it doesnt seem to add much value and adds room for bugs.
// If we want to re-add it, we need to add a check to ensure someone has an eslint config before linting files
// and set eslint as an optional dependency
// import { ESLint } from "eslint";
// NOTE: this could be sped up by formatting the generated file string prior to writing (no need to write file then read it again here and re-write it)
const prettifyFiles = (filePaths) => {
    const config = prettier.resolveConfig.sync(process.cwd(), { useCache: true, editorconfig: true }) ?? {};
    filePaths.forEach((filePath) => {
        const ogContent = fs.readFileSync(filePath);
        const formattedContent = prettier.format(ogContent.toString(), {
            ...config,
            parser: "typescript"
        });
        fs.writeFileSync(filePath, formattedContent);
    });
};
// const fixFiles = async (_filePaths: string[]) => {
// const eslint = new ESLint({ fix: true });
// const results = await eslint.lintFiles(filePaths);
// await ESLint.outputFixes(results);
// };
export const format = async (filePaths) => {
    prettifyFiles(filePaths);
    // await fixFiles(filePaths);
};
