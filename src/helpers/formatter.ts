import path from "path";
import fs from "fs";
import prettier from "prettier";

// NOTE: this could be sped up by formatting the generated file string prior to writing (no need to write file then read it again here and re-write it)

const prettifyFile = (filePath: string, config: prettier.Options) => {
  const ogContent = fs.readFileSync(filePath);
  const formattedContent = prettier.format(ogContent.toString(), {
    ...config,
    parser: "typescript"
  });
  fs.writeFileSync(filePath, formattedContent);
};

export const format = (folderPath: string) => {
  const config =
    prettier.resolveConfig.sync(process.cwd(), { useCache: true, editorconfig: true }) ?? {};
  const genPath = path.join(folderPath, "index.d.ts");
  const customPath = path.join(folderPath, "custom.d.ts");
  prettifyFile(genPath, config);
  prettifyFile(customPath, config);
};
