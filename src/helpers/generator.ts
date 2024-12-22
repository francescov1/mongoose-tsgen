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

/**
 * Sanitizes a model name to be used as a TypeScript type name.
 * Handles dot notation (e.g. "user.profile" -> "UserProfile") and validates the result.
 *
 * @param name - The model name to sanitize
 * @returns The sanitized model name that can be used as a TypeScript type
 * @throws {Error} If the name is empty, invalid, or results in an invalid TypeScript type name
 * @throws {TypeError} If the name is not a string
 */
export const sanitizeModelName = (name: string): string => {
  if (typeof name !== "string") {
    console.error(`Model name must be a string, received: ${typeof name}`);
    throw new TypeError(`Model name must be a string, received: ${typeof name}`);
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    console.error("Model name cannot be empty");
    throw new Error("Model name cannot be empty");
  }

  // List of TypeScript reserved keywords (we should probably use an external dep for this since I'm sure I missed many)
  const reservedKeywords = new Set([
    "string",
    "number",
    "boolean",
    "any",
    "void",
    "null",
    "undefined",
    "object",
    "function",
    "class",
    "interface",
    "enum",
    "type",
    "abstract",
    "implements",
    "extends",
    "new",
    "private",
    "protected",
    "public",
    "static",
    "super",
    "this",
    "readonly"
  ]);
  // Convert dots to nothing and capitalize first letter after each dot
  const finalName = trimmedName
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  // Check if the final name is valid
  if (/^[0-9]/.test(finalName)) {
    console.error(`Invalid model name: "${name}" - type name cannot start with a number`);
    throw new Error(`Invalid model name: "${name}" - type name cannot start with a number`);
  }

  if (reservedKeywords.has(finalName.toLowerCase())) {
    console.error(`Invalid model name: "${name}" - cannot use TypeScript reserved keyword`);
    throw new Error(`Invalid model name: "${name}" - cannot use TypeScript reserved keyword`);
  }

  // Validate the final name is a valid TypeScript identifier
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(finalName)) {
    console.error(
      `Invalid model name: "${name}" - results in invalid TypeScript identifier "${finalName}"`
    );
    throw new Error(
      `Invalid model name: "${name}" - results in invalid TypeScript identifier "${finalName}"`
    );
  }

  return finalName;
};

interface TypeMapping {
  thisType: string;
  returnType: string;
}

const TYPE_MAPPINGS: Record<"query" | "methods" | "statics", (modelName: string) => TypeMapping> = {
  query: (modelName: string) => ({
    thisType: `${modelName}Query`,
    returnType: `${modelName}Query`
  }),
  methods: (modelName: string) => ({
    thisType: `${modelName}Document`,
    returnType: "any"
  }),
  statics: (modelName: string) => ({
    thisType: `${modelName}Model`,
    returnType: "any"
  })
};

interface ParsedSignature {
  params: string;
  returnType: string;
}

const parseSignature = (signature: string): ParsedSignature | null => {
  const match = signature?.match(/\((?:this: \w*(?:, )?)?(?<params>.*)\) => (?<returnType>.*)/);

  if (!match?.groups) {
    return null;
  }

  return {
    params: match.groups.params,
    returnType: match.groups.returnType
  };
};

export const convertFuncSignatureToType = (
  funcSignature: string,
  funcType: keyof typeof TYPE_MAPPINGS,
  modelName: string
): string => {
  try {
    const sanitizedModelName = sanitizeModelName(modelName);
    const typeMapping = TYPE_MAPPINGS[funcType](sanitizedModelName);

    const parsedSignature = parseSignature(funcSignature);
    if (!parsedSignature) {
      console.warn(
        `Failed to parse function signature: ${funcSignature}, please open an issue if you believe this is an error`
      );
      return `(this: ${typeMapping.thisType}) => ${typeMapping.returnType}`;
    }

    const { params, returnType } = parsedSignature;
    const paramsString = params?.length > 0 ? `, ${params}` : "";

    const finalReturnType =
      funcType === "query" ? typeMapping.returnType : returnType || typeMapping.returnType;

    return `(this: ${typeMapping.thisType}${paramsString}) => ${finalReturnType}`;
  } catch (error) {
    console.error(
      "Error converting function signature:",
      error instanceof Error ? error.message : error
    );
    const fallbackMapping = TYPE_MAPPINGS[funcType](modelName);
    return `(this: ${fallbackMapping.thisType}) => ${fallbackMapping.returnType}`;
  }
};

export const replaceModelTypes = (
  sourceFile: SourceFile,
  modelTypes: TsReaderModelTypes,
  models: MongooseModel[]
) => {
  Object.entries(modelTypes).forEach(([modelName, types]) => {
    const sanitizedModelName = sanitizeModelName(modelName);
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
  const sanitizedModelName = sanitizeModelName(modelName);
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

// TODO: This should be split up, shouldn't be writing to file and parsing schema simultaneously. Instead parse schema first then write later.
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
      const sanitizedModelName = sanitizeModelName(modelName);

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
