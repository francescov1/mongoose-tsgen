import { Project, SourceFile, SyntaxKind, PropertySignature } from "ts-morph";
import * as templates from "./templates";
import { TsReaderModelTypes } from "../types";
import { ParserSchema } from "../parser/schema";
import {
  convertBaseTypeToTs,
  formatKeyEntry,
  getShouldLeanIncludeVirtuals,
  loadSchemasFromModelPath
} from "../parser/utils";
import { MongooseSchema } from "../parser/types";

// this strips comments of special tokens since ts-morph generates jsdoc tokens automatically
const cleanComment = (comment: string) => {
  return comment
    .replace(/^\/\*\*[^\S\r\n]?/, "")
    .replace(/[^\S\r\n]+\*\s/g, "")
    .replace(/(\n)?[^\S\r\n]+\*\/$/, "");
};

const convertFuncSignatureToType = (
  funcSignature: string,
  funcType: "methods" | "statics" | "query",
  modelName: string
) => {
  const [, params, returnType] = funcSignature.match(/\((?:this: \w*(?:, )?)?(.*)\) => (.*)/) ?? [];
  let type;
  if (funcType === "query") {
    type = `(this: ${modelName}Query${
      params?.length > 0 ? ", " + params : ""
    }) => ${modelName}Query`;
  } else if (funcType === "methods") {
    type = `(this: ${modelName}Document${params?.length > 0 ? ", " + params : ""}) => ${
      returnType ?? "any"
    }`;
  } else {
    type = `(this: ${modelName}Model${params?.length > 0 ? ", " + params : ""}) => ${
      returnType ?? "any"
    }`;
  }

  return type;
};

export const replaceModelTypes = (
  sourceFile: SourceFile,
  modelTypes: TsReaderModelTypes,
  // TODO: Combine with other types
  schemas: { schema: MongooseSchema; model: any; modelName: string }[]
) => {
  Object.entries(modelTypes).forEach(([modelName, types]) => {
    const { methods, statics, query, virtuals, comments } = types;

    // methods
    if (Object.keys(methods).length > 0) {
      sourceFile
        ?.getTypeAlias(`${modelName}Methods`)
        ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
        ?.getChildrenOfKind(SyntaxKind.PropertySignature)
        .forEach(prop => {
          const signature = methods[prop.getName()];
          if (signature) {
            const funcType = convertFuncSignatureToType(signature, "methods", modelName);
            prop.setType(funcType);
          }
        });
    }

    // statics
    if (Object.keys(statics).length > 0) {
      sourceFile
        ?.getTypeAlias(`${modelName}Statics`)
        ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
        ?.getChildrenOfKind(SyntaxKind.PropertySignature)
        .forEach(prop => {
          const signature = statics[prop.getName()];
          if (signature) {
            const funcType = convertFuncSignatureToType(signature, "statics", modelName);
            prop.setType(funcType);
          }
        });
    }

    // queries
    if (Object.keys(query).length > 0) {
      sourceFile
        ?.getTypeAlias(`${modelName}Queries`)
        ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
        ?.getChildrenOfKind(SyntaxKind.PropertySignature)
        .forEach(prop => {
          const signature = query[prop.getName()];
          if (signature) {
            const funcType = convertFuncSignatureToType(signature, "query", modelName);
            prop.setType(funcType);
          }
        });
    }

    // virtuals
    const virtualNames = Object.keys(virtuals);
    if (virtualNames.length > 0) {
      const documentProperties = sourceFile
        ?.getTypeAlias(`${modelName}Document`)
        ?.getFirstChildByKind(SyntaxKind.IntersectionType)
        ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
        ?.getChildrenOfKind(SyntaxKind.PropertySignature);

      // TODO: Review this
      const { schema } = schemas.find(
        ({ modelName: schemaModelName }) => schemaModelName === modelName
      )!;

      const leanProperties =
        getShouldLeanIncludeVirtuals(schema) &&
        sourceFile
          ?.getTypeAlias(`${modelName}`)
          ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
          ?.getChildrenOfKind(SyntaxKind.PropertySignature);

      if (documentProperties || leanProperties) {
        virtualNames.forEach(virtualName => {
          const virtualNameComponents = virtualName.split(".");
          let nestedDocProps: PropertySignature[] | undefined;
          let nestedLeanProps: PropertySignature[] | undefined;

          virtualNameComponents.forEach((nameComponent, i) => {
            if (i === virtualNameComponents.length - 1) {
              if (documentProperties) {
                const docPropMatch = (nestedDocProps ?? documentProperties).find(
                  prop => prop.getName() === nameComponent
                );
                docPropMatch?.setType(virtuals[virtualName]);
              }
              if (leanProperties) {
                const leanPropMatch = (nestedLeanProps ?? leanProperties).find(
                  prop => prop.getName() === nameComponent
                );
                leanPropMatch?.setType(virtuals[virtualName]);
              }

              return;
            }

            if (documentProperties) {
              nestedDocProps = (nestedDocProps ?? documentProperties)
                .find(prop => prop.getName() === nameComponent)
                ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
                ?.getChildrenOfKind(SyntaxKind.PropertySignature);
            }
            if (leanProperties) {
              nestedLeanProps = (nestedLeanProps ?? leanProperties)
                .find(prop => prop.getName() === nameComponent)
                ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
                ?.getChildrenOfKind(SyntaxKind.PropertySignature);
            }
          });
        });
      }
    }

    // TODO: this section is almost identical to the virtual property section above, refactor
    if (comments.length > 0) {
      const documentProperties = sourceFile
        ?.getTypeAlias(`${modelName}Document`)
        ?.getFirstChildByKind(SyntaxKind.IntersectionType)
        ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
        ?.getChildrenOfKind(SyntaxKind.PropertySignature);

      const leanProperties = sourceFile
        ?.getTypeAlias(`${modelName}`)
        ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
        ?.getChildrenOfKind(SyntaxKind.PropertySignature);

      comments.forEach(({ path, comment }) => {
        const pathComponents = path.split(".");
        let nestedDocProps: PropertySignature[] | undefined;
        let nestedLeanProps: PropertySignature[] | undefined;

        pathComponents.forEach((nameComponent, i) => {
          if (i === pathComponents.length - 1) {
            if (documentProperties) {
              const docPropMatch = (nestedDocProps ?? documentProperties).find(
                prop => prop.getName() === nameComponent
              );

              docPropMatch?.addJsDoc(cleanComment(comment));
            }
            if (leanProperties) {
              const leanPropMatch = (nestedLeanProps ?? leanProperties).find(
                prop => prop.getName() === nameComponent
              );

              leanPropMatch?.addJsDoc(cleanComment(comment));
            }

            return;
          }

          if (documentProperties) {
            nestedDocProps = (nestedDocProps ?? documentProperties)
              .find(prop => prop.getName() === nameComponent)
              ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
              ?.getChildrenOfKind(SyntaxKind.PropertySignature);
          }
          if (leanProperties) {
            nestedLeanProps = (nestedLeanProps ?? leanProperties)
              .find(prop => prop.getName() === nameComponent)
              ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
              ?.getChildrenOfKind(SyntaxKind.PropertySignature);
          }
        });
      });
    }
  });
};

export const addPopulateHelpers = (sourceFile: SourceFile) => {
  sourceFile.addStatements("\n" + templates.POPULATE_HELPERS);
};

export const overloadQueryPopulate = (sourceFile: SourceFile) => {
  sourceFile.addStatements("\n" + templates.QUERY_POPULATE);
};

export const createSourceFile = (genPath: string) => {
  const project = new Project();
  const sourceFile = project.createSourceFile(genPath, "", { overwrite: true });
  return sourceFile;
};

export const parseFunctions = (
  funcs: any,
  modelName: string,
  funcType: "methods" | "statics" | "query"
) => {
  let interfaceString = "";

  Object.keys(funcs).forEach(key => {
    if (["initializeTimestamps"].includes(key)) return;

    const funcSignature = "(...args: any[]) => any";
    const type = convertFuncSignatureToType(funcSignature, funcType, modelName);
    interfaceString += formatKeyEntry({ key, val: type });
  });

  return interfaceString;
};

export const getSchemaTypes = ({ schema, modelName }: { schema: any; modelName: string }) => {
  let schemaTypes = "";

  // add type alias to modelName so that it can be imported without clashing with the mongoose model
  schemaTypes += templates.getObjectDocs(modelName);
  schemaTypes += `\nexport type ${modelName}Object = ${modelName}\n\n`;

  schemaTypes += templates.getQueryDocs();
  schemaTypes += `\nexport type ${modelName}Query = mongoose.Query<any, ${modelName}Document, ${modelName}Queries> & ${modelName}Queries\n\n`;

  schemaTypes += templates.getQueryHelpersDocs(modelName);
  schemaTypes += `\nexport type ${modelName}Queries = {\n`;
  schemaTypes += parseFunctions(schema.query ?? {}, modelName, "query");
  schemaTypes += "}\n";

  schemaTypes += `\nexport type ${modelName}Methods = {\n`;
  schemaTypes += parseFunctions(schema.methods, modelName, "methods");
  schemaTypes += "}\n";

  schemaTypes += `\nexport type ${modelName}Statics = {\n`;
  schemaTypes += parseFunctions(schema.statics, modelName, "statics");
  schemaTypes += "}\n\n";

  const modelExtend = `mongoose.Model<${modelName}Document, ${modelName}Queries>`;

  schemaTypes += templates.getModelDocs(modelName);
  schemaTypes += `\nexport type ${modelName}Model = ${modelExtend} & ${modelName}Statics\n\n`;

  schemaTypes += templates.getSchemaDocs(modelName);
  schemaTypes += `\nexport type ${modelName}Schema = mongoose.Schema<${modelName}Document, ${modelName}Model, ${modelName}Methods, ${modelName}Queries>\n\n`;

  return schemaTypes;
};

export const generateTypes = ({
  sourceFile,
  imports = [],
  modelsPaths,
  noMongoose,
  datesAsStrings
}: {
  sourceFile: SourceFile;
  modelsPaths: string[];
  imports?: string[];
  noMongoose: boolean;
  datesAsStrings: boolean;
}) => {
  const schemas = loadSchemasFromModelPath(modelsPaths);

  sourceFile.addStatements(writer => {
    writer.write(templates.MAIN_HEADER).blankLine();
    // mongoose import
    if (!noMongoose) writer.write(templates.MONGOOSE_IMPORT);

    // custom, user-defined imports
    if (imports.length > 0) writer.write(imports.join("\n"));

    writer.blankLine();
    // writer.write("if (true)").block(() => {
    //     writer.write("something;");
    // });

    schemas.forEach(({ modelName, schema, model }) => {
      // passing modelName causes childSchemas to be processed

      const leanHeader = templates.getLeanDocs(modelName) + `\nexport type ${modelName} = {\n`;
      const leanFooter = "}";

      const parserSchema = new ParserSchema({
        mongooseSchema: schema,
        modelName,
        model
      });

      const leanInterfaceStr = parserSchema.generateTemplate({
        isDocument: false,
        noMongoose,
        datesAsStrings,
        header: leanHeader,
        footer: leanFooter
      });

      writer.write(leanInterfaceStr).blankLine();

      // if noMongoose, skip adding document types
      if (noMongoose) {
        return;
      }

      // get type of _id to pass to mongoose.Document
      const _idType = schema.tree._id ?
        convertBaseTypeToTs({
            key: "_id",
            val: schema.tree._id,
            isDocument: true,
            noMongoose,
            datesAsStrings
          }) :
        "any";
      const mongooseDocExtend = `mongoose.Document<${_idType}, ${modelName}Queries>`;

      let documentInterfaceStr = "";
      documentInterfaceStr += getSchemaTypes({ schema, modelName });

      const documentHeader =
        templates.getDocumentDocs(modelName) +
        `\nexport type ${modelName}Document = ${mongooseDocExtend} & ${modelName}Methods & {\n`;
      const documentFooter = "}";

      documentInterfaceStr += parserSchema.generateTemplate({
        isDocument: true,
        noMongoose,
        datesAsStrings,
        header: documentHeader,
        footer: documentFooter
      });

      writer.write(documentInterfaceStr).blankLine();
    });
  });

  return sourceFile;
};

export const saveFile = ({ sourceFile }: { sourceFile: SourceFile; genFilePath: string }) => {
  try {
    sourceFile.saveSync();
    // fs.writeFileSync(genFilePath, sourceFile.getFullText(), "utf8");
  } catch (err) {
    // if folder doesnt exist, create and then write again
    // if (err.message.includes("ENOENT: no such file or directory")) {
    //   console.log(`Path ${genFilePath} not found; creating...`);

    //   const { dir } = path.parse(genFilePath);
    //   mkdirp.sync(dir);

    //   fs.writeFileSync(genFilePath, sourceFile.getFullText(), "utf8");
    // }
    console.error(err);
    throw err;
  }
};
