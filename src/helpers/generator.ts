import { Project, SourceFile, SyntaxKind, PropertySignature } from "ts-morph";
import * as templates from "./templates";
import { TsReaderModelTypes } from "../types";
import { ParserSchema } from "../parser/schema";
import { convertBaseTypeToTs, getShouldLeanIncludeVirtuals, loadModels } from "../parser/utils";
import { MongooseModel } from "../parser/types";
import { convertKeyValueToLine } from "../writer/stringBuilder";

// TODO next: Pull this file apart. Create a new "file writer" file, move all the ts stuff somewhere else,

export const cleanComment = (comment: string): string => {
  if (!comment) return "";
  if (comment.trim() === "/** */") return "";

  return comment
    .replace(/^\/\*\*[^\S\r\n]?/, "") // Remove opening /**
    .replace(/[^\S\r\n]+\*\s/g, "") // Remove * at start of lines
    .replace(/(\n)?[^\S\r\n]+\*\/$/, ""); // Remove closing */
};

export const sanitizeTypeName = (name: string): string => {
  try {
    // First, handle empty or invalid input
    if (!name) {
      console.warn('sanitizeTypeName received empty name, using default "UnknownType"');
      return "UnknownType";
    }

    if (typeof name !== "string") {
      console.warn(
        `sanitizeTypeName received non-string input: ${typeof name}, using default "UnknownType"`
      );
      return "UnknownType";
    }

    const parts = name
      // Split on any non-alphanumeric characters (including dots)
      .split(/[^a-zA-Z0-9]+/)
      // Filter out empty parts
      .filter(Boolean);

    if (parts.length === 0) {
      console.warn("sanitizeTypeName: name contained no valid parts after splitting");
      return "UnknownType";
    }

    const sanitizedName = parts
      // Transform each part
      .map((part) => {
        try {
          // Remove any invalid characters
          const cleaned = part.replace(/[^a-zA-Z0-9]/g, "");

          if (!cleaned) {
            console.warn(`sanitizeTypeName: part "${part}" contained no valid characters`);
            return "";
          }

          // Ensure the part starts with a letter
          if (/^[0-9]/.test(cleaned)) {
            return `T${cleaned}`;
          }

          // Capitalize first letter and keep rest as is
          return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        } catch (err) {
          console.error(`Error processing part "${part}":`, err);
          return "";
        }
      })
      .filter(Boolean) // Remove any empty strings from failed processing
      .join("");

    if (!sanitizedName) {
      console.warn('sanitizeTypeName: all parts were invalid, using default "UnknownType"');
      return "UnknownType";
    }

    return sanitizedName;
  } catch (err) {
    console.error("Error in sanitizeTypeName:", err);
    return "UnknownType";
  }
};

export const convertFuncSignatureToType = (
  funcSignature: string,
  funcType: "methods" | "statics" | "query",
  modelName: string
): string => {
  try {
    const sanitizedModelName = sanitizeTypeName(modelName);

    // Extract parameters and return type using regex with named groups
    const signatureMatch = funcSignature?.match(
      /\((?:this: \w*(?:, )?)?(?<params>.*)\) => (?<returnType>.*)/
    );

    if (!signatureMatch?.groups) {
      console.warn(
        `Failed to parse function signature: ${funcSignature}, please open an issue if you believe this is an error`
      );
      return `(this: ${sanitizedModelName}Document) => any`;
    }

    const { params, returnType } = signatureMatch.groups;
    const hasParams = params?.length > 0;
    const paramsString = hasParams ? `, ${params}` : "";

    // Map function types to their corresponding this types and return types
    const typeMap = {
      query: {
        thisType: `${sanitizedModelName}Query`,
        returnType: `${sanitizedModelName}Query`
      },
      methods: {
        thisType: `${sanitizedModelName}Document`,
        returnType: returnType || "any"
      },
      statics: {
        thisType: `${sanitizedModelName}Model`,
        returnType: returnType || "any"
      }
    };

    const { thisType, returnType: mappedReturnType } = typeMap[funcType];

    return `(this: ${thisType}${paramsString}) => ${mappedReturnType}`;
  } catch (err) {
    console.error("Error converting function signature:", err);
    return `() => any`;
  }
};

export const replaceModelTypes = (
  sourceFile: SourceFile,
  modelTypes: TsReaderModelTypes,
  models: MongooseModel[]
) => {
  Object.entries(modelTypes).forEach(([modelName, types]) => {
    const sanitizedModelName = sanitizeTypeName(modelName);
    const { methods, statics, query, virtuals, comments } = types;

    // methods
    if (Object.keys(methods).length > 0) {
      sourceFile
        ?.getTypeAlias(`${sanitizedModelName}Methods`)
        ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
        ?.getChildrenOfKind(SyntaxKind.PropertySignature)
        .forEach((prop) => {
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
        ?.getTypeAlias(`${sanitizedModelName}Statics`)
        ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
        ?.getChildrenOfKind(SyntaxKind.PropertySignature)
        .forEach((prop) => {
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
        ?.getTypeAlias(`${sanitizedModelName}Queries`)
        ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
        ?.getChildrenOfKind(SyntaxKind.PropertySignature)
        .forEach((prop) => {
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
        ?.getTypeAlias(`${sanitizedModelName}Document`)
        ?.getFirstChildByKind(SyntaxKind.IntersectionType)
        ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
        ?.getChildrenOfKind(SyntaxKind.PropertySignature);

      const { schema } = models.find((model) => model.modelName === modelName)!;

      const leanProperties =
        getShouldLeanIncludeVirtuals(schema) &&
        sourceFile
          ?.getTypeAlias(`${sanitizedModelName}`)
          ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
          ?.getChildrenOfKind(SyntaxKind.PropertySignature);

      if (documentProperties || leanProperties) {
        virtualNames.forEach((virtualName) => {
          const virtualNameComponents = virtualName.split(".");
          let nestedDocProps: PropertySignature[] | undefined;
          let nestedLeanProps: PropertySignature[] | undefined;

          virtualNameComponents.forEach((nameComponent, i) => {
            if (i === virtualNameComponents.length - 1) {
              if (documentProperties) {
                const docPropMatch = (nestedDocProps ?? documentProperties).find(
                  (prop) => prop.getName() === nameComponent
                );
                docPropMatch?.setType(virtuals[virtualName]);
              }
              if (leanProperties) {
                const leanPropMatch = (nestedLeanProps ?? leanProperties).find(
                  (prop) => prop.getName() === nameComponent
                );
                leanPropMatch?.setType(virtuals[virtualName]);
              }

              return;
            }

            if (documentProperties) {
              nestedDocProps = (nestedDocProps ?? documentProperties)
                .find((prop) => prop.getName() === nameComponent)
                ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
                ?.getChildrenOfKind(SyntaxKind.PropertySignature);
            }
            if (leanProperties) {
              nestedLeanProps = (nestedLeanProps ?? leanProperties)
                .find((prop) => prop.getName() === nameComponent)
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
        ?.getTypeAlias(`${sanitizedModelName}Document`)
        ?.getFirstChildByKind(SyntaxKind.IntersectionType)
        ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
        ?.getChildrenOfKind(SyntaxKind.PropertySignature);

      const leanProperties = sourceFile
        ?.getTypeAlias(`${sanitizedModelName}`)
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
                (prop) => prop.getName() === nameComponent
              );

              docPropMatch?.addJsDoc(cleanComment(comment));
            }
            if (leanProperties) {
              const leanPropMatch = (nestedLeanProps ?? leanProperties).find(
                (prop) => prop.getName() === nameComponent
              );

              leanPropMatch?.addJsDoc(cleanComment(comment));
            }

            return;
          }

          if (documentProperties) {
            nestedDocProps = (nestedDocProps ?? documentProperties)
              .find((prop) => prop.getName() === nameComponent)
              ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
              ?.getChildrenOfKind(SyntaxKind.PropertySignature);
          }
          if (leanProperties) {
            nestedLeanProps = (nestedLeanProps ?? leanProperties)
              .find((prop) => prop.getName() === nameComponent)
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

// TODO: statics, query, methods should all be parsed in the parser, and then written in the stringBuilder
export const parseFunctions = (
  funcs: { [key: string]: () => any },
  modelName: string,
  funcType: "methods" | "statics" | "query"
) => {
  let interfaceString = "";

  Object.keys(funcs).forEach((key) => {
    if (["initializeTimestamps"].includes(key)) return;

    const funcSignature = "(...args: any[]) => any";
    const type = convertFuncSignatureToType(funcSignature, funcType, modelName);
    interfaceString += convertKeyValueToLine({ key, valueType: type });
  });

  return interfaceString;
};

export const getSchemaTypes = (model: MongooseModel) => {
  const { modelName, schema } = model;
  const sanitizedModelName = sanitizeTypeName(modelName);
  let schemaTypes = "";

  // add type alias to modelName so that it can be imported without clashing with the mongoose model
  schemaTypes += templates.getObjectDocs(sanitizedModelName);
  schemaTypes += `\nexport type ${sanitizedModelName}Object = ${sanitizedModelName}\n\n`;

  schemaTypes += templates.getQueryDocs();
  schemaTypes += `\nexport type ${sanitizedModelName}Query = mongoose.Query<any, ${sanitizedModelName}Document, ${sanitizedModelName}Queries> & ${sanitizedModelName}Queries\n\n`;

  schemaTypes += templates.getQueryHelpersDocs(sanitizedModelName);
  schemaTypes += `\nexport type ${sanitizedModelName}Queries = {\n`;
  schemaTypes += parseFunctions(schema.query ?? {}, modelName, "query");
  schemaTypes += "}\n";

  schemaTypes += `\nexport type ${sanitizedModelName}Methods = {\n`;
  schemaTypes += parseFunctions(schema.methods, modelName, "methods");
  schemaTypes += "}\n";

  schemaTypes += `\nexport type ${sanitizedModelName}Statics = {\n`;
  schemaTypes += parseFunctions(schema.statics, modelName, "statics");
  schemaTypes += "}\n\n";

  const modelExtend = `mongoose.Model<${sanitizedModelName}Document, ${sanitizedModelName}Queries>`;

  schemaTypes += templates.getModelDocs(sanitizedModelName);
  schemaTypes += `\nexport type ${sanitizedModelName}Model = ${modelExtend} & ${sanitizedModelName}Statics\n\n`;

  schemaTypes += templates.getSchemaDocs(sanitizedModelName);
  schemaTypes += `\nexport type ${sanitizedModelName}Schema = mongoose.Schema<${sanitizedModelName}Document, ${sanitizedModelName}Model, ${sanitizedModelName}Methods, ${sanitizedModelName}Queries>\n\n`;

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
  const models = loadModels(modelsPaths);

  sourceFile.addStatements((writer) => {
    writer.write(templates.MAIN_HEADER).blankLine();
    // mongoose import
    if (!noMongoose) writer.write(templates.MONGOOSE_IMPORT);

    // custom, user-defined imports
    if (imports.length > 0) writer.write(imports.join("\n"));

    writer.blankLine();

    models.forEach((model) => {
      const { modelName, schema } = model;
      const sanitizedModelName = sanitizeTypeName(modelName);

      const leanHeader =
        templates.getLeanDocs(sanitizedModelName) + `\nexport type ${sanitizedModelName} = {\n`;
      const leanFooter = "}";

      const parserSchema = new ParserSchema({
        mongooseSchema: schema,
        modelName: sanitizedModelName,
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
      const _idType = schema.tree._id
        ? convertBaseTypeToTs({
            key: "_id",
            val: schema.tree._id,
            isDocument: true,
            noMongoose,
            datesAsStrings
          })
        : "any";
      const mongooseDocExtend = `mongoose.Document<${_idType}, ${sanitizedModelName}Queries>`;

      let documentInterfaceStr = "";
      documentInterfaceStr += getSchemaTypes(model);

      const documentHeader =
        templates.getDocumentDocs(sanitizedModelName) +
        `\nexport type ${sanitizedModelName}Document = ${mongooseDocExtend} & ${sanitizedModelName}Methods & {\n`;
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

export const saveFile = ({ sourceFile }: { sourceFile: SourceFile; generatedFilePath: string }) => {
  try {
    sourceFile.saveSync();
  } catch (err) {
    console.error(err);
    throw err;
  }
};
