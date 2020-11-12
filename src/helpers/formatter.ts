import path from "path";
import fs from "fs";
import prettier from "prettier";
import { ESLint } from "eslint";

// NOTE: this could be sped up by formatting the generated file string prior to writing (no need to write file then read it again here and re-write it)

const prettifyFiles = (filePaths: string[]) => {
  const config =
    prettier.resolveConfig.sync(process.cwd(), { useCache: true, editorconfig: true }) ?? {};

  filePaths.forEach((filePath: string) => {
    const ogContent = fs.readFileSync(filePath);
    const formattedContent = prettier.format(ogContent.toString(), {
      ...config,
      parser: "typescript"
    });
    fs.writeFileSync(filePath, formattedContent);
  });
};

const fixFiles = async (filePaths: string[]) => {
  const eslint = new ESLint({ fix: true });
  const results = await eslint.lintFiles(filePaths);
  await ESLint.outputFixes(results);
};

export const format = async (folderPath: string) => {
  const genPath = path.join(folderPath, "index.d.ts");
  const customPath = path.join(folderPath, "custom.d.ts");
  prettifyFiles([genPath, customPath]);
  await fixFiles([genPath, customPath]);
};
