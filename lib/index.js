import { Flags, Command, Args, Config, ux } from '@oclif/core';
import { Project, Node, SyntaxKind } from 'ts-morph';
import glob from 'glob';
import path, { dirname } from 'path';
import * as fs from 'fs';
import fs__default from 'fs';
import stripJsonComments from 'strip-json-comments';
import resolve from 'resolve';
import prettier from 'prettier';
import mongoose from 'mongoose';
import _ from 'lodash';
import pluralize from 'pluralize';
import { pathToFileURL, fileURLToPath } from 'url';

function getNameAndType(funcDeclaration) {
    const name = funcDeclaration.getName();
    const typeNode = funcDeclaration.getType();
    const type = typeNode.getText(funcDeclaration);
    return { name, type };
}
function findCommentsInFile(sourceFile, modelTypes, maxCommentDepth) {
    // TODO: this is reused from findTypesInFile, should abstract out instead
    const schemaModelMapping = {};
    Object.keys(modelTypes).forEach((modelName) => {
        const { schemaVariableName } = modelTypes[modelName];
        if (schemaVariableName)
            schemaModelMapping[schemaVariableName] = modelName;
    });
    for (const statement of sourceFile.getStatements()) {
        if (!Node.isVariableStatement(statement))
            continue;
        const varDeclarationList = statement.getChildAtIndexIfKind(0, SyntaxKind.VariableDeclarationList);
        if (!varDeclarationList)
            continue;
        const varDeclaration = varDeclarationList.getFirstChildByKind(SyntaxKind.VariableDeclaration);
        if (!varDeclaration)
            continue;
        const schemaName = varDeclaration.getFirstChildByKind(SyntaxKind.Identifier)?.getText();
        if (!schemaName)
            continue;
        const modelName = schemaModelMapping[schemaName];
        if (!modelName) {
            continue;
        }
        const newExpression = varDeclaration.getFirstChildByKind(SyntaxKind.NewExpression);
        if (!newExpression)
            continue;
        const objLiteralExp = newExpression.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression);
        if (!objLiteralExp)
            continue;
        const extractComments = (objLiteralExp, rootPath) => {
            const propAssignments = objLiteralExp.getChildrenOfKind(SyntaxKind.PropertyAssignment);
            propAssignments.forEach((propAssignment) => {
                const propName = propAssignment.getFirstChildByKind(SyntaxKind.Identifier)?.getText();
                if (!propName)
                    return;
                const path = rootPath ? `${rootPath}.${propName}` : propName;
                propAssignment.getLeadingCommentRanges().forEach((commentRange) => {
                    const commentText = commentRange.getText();
                    // skip comments that are not jsdocs
                    if (!commentText.startsWith("/**"))
                        return;
                    modelTypes[modelName].comments.push({
                        path,
                        comment: commentText
                    });
                });
                if (rootPath.split(".").length < maxCommentDepth) {
                    const nestedObjLiteralExp = propAssignment.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression);
                    if (nestedObjLiteralExp) {
                        extractComments(nestedObjLiteralExp, path);
                    }
                }
            });
        };
        extractComments(objLiteralExp, "");
    }
    // TODO: get virtual comments
    return modelTypes;
}
function findTypesInFile(sourceFile, modelTypes) {
    const schemaModelMapping = {};
    Object.keys(modelTypes).forEach((modelName) => {
        const { schemaVariableName } = modelTypes[modelName];
        if (schemaVariableName)
            schemaModelMapping[schemaVariableName] = modelName;
    });
    for (const statement of sourceFile.getStatements()) {
        if (!Node.isExpressionStatement(statement))
            continue;
        const binaryExpr = statement.getChildAtIndexIfKind(0, SyntaxKind.BinaryExpression);
        const callExpr = statement.getChildAtIndexIfKind(0, SyntaxKind.CallExpression);
        if (binaryExpr) {
            // left is a propertyaccessexpression, children are [identifier, dottoken, identifier]
            const left = binaryExpr.getLeft();
            const right = binaryExpr.getRight();
            if (left.getKind() !== SyntaxKind.PropertyAccessExpression)
                continue;
            if (right.getKind() !== SyntaxKind.AsExpression &&
                right.getKind() !== SyntaxKind.ObjectLiteralExpression &&
                right.getKind() !== SyntaxKind.TypeAssertionExpression)
                continue;
            const leftChildren = left.getChildren();
            let modelName;
            const hasSchemaIdentifier = leftChildren.some((child) => {
                if (child.getKind() !== SyntaxKind.Identifier)
                    return false;
                modelName = schemaModelMapping[child.getText()];
                if (!modelName)
                    return false;
                return true;
            });
            const hasDotToken = leftChildren.some((child) => child.getKind() === SyntaxKind.DotToken);
            if (!hasSchemaIdentifier || !hasDotToken)
                continue;
            const hasMethodsIdentifier = leftChildren.some((child) => child.getKind() === SyntaxKind.Identifier && child.getText() === "methods");
            const hasStaticsIdentifier = leftChildren.some((child) => child.getKind() === SyntaxKind.Identifier && child.getText() === "statics");
            const hasQueryIdentifier = leftChildren.some((child) => child.getKind() === SyntaxKind.Identifier && child.getText() === "query");
            let rightFuncDeclarations = [];
            if (right.getKind() === SyntaxKind.ObjectLiteralExpression) {
                rightFuncDeclarations = right.getChildrenOfKind(SyntaxKind.MethodDeclaration);
            }
            else if (right.getKind() === SyntaxKind.AsExpression) {
                const objLiteralExp = right.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression);
                if (objLiteralExp)
                    rightFuncDeclarations = objLiteralExp.getChildrenOfKind(SyntaxKind.MethodDeclaration);
            }
            else if (right.getKind() === SyntaxKind.TypeAssertionExpression) {
                const objLiteralExp = right.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression);
                if (objLiteralExp) {
                    rightFuncDeclarations = objLiteralExp.getChildrenOfKind(SyntaxKind.MethodDeclaration);
                }
            }
            else {
                rightFuncDeclarations = right.getChildrenOfKind(SyntaxKind.MethodDeclaration);
            }
            if (hasMethodsIdentifier) {
                rightFuncDeclarations.forEach((declaration) => {
                    const { name, type } = getNameAndType(declaration);
                    modelTypes[modelName].methods[name] = type;
                });
            }
            else if (hasStaticsIdentifier) {
                rightFuncDeclarations.forEach((declaration) => {
                    const { name, type } = getNameAndType(declaration);
                    modelTypes[modelName].statics[name] = type;
                });
            }
            else if (hasQueryIdentifier) {
                rightFuncDeclarations.forEach((declaration) => {
                    const { name, type } = getNameAndType(declaration);
                    modelTypes[modelName].query[name] = type;
                });
            }
        }
        else if (callExpr) {
            // virtual property
            let propAccessExpr = callExpr.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
            if (propAccessExpr?.getName() === "set") {
                propAccessExpr = propAccessExpr
                    .getFirstChildByKind(SyntaxKind.CallExpression)
                    ?.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
            }
            if (propAccessExpr?.getName() !== "get")
                continue;
            const schemaVariableName = propAccessExpr
                .getFirstChildByKind(SyntaxKind.CallExpression)
                ?.getFirstChildByKind(SyntaxKind.PropertyAccessExpression)
                ?.getFirstChildByKind(SyntaxKind.Identifier)
                ?.getText();
            if (schemaVariableName) {
                if (process.env.DEBUG)
                    console.log("tsreader: Found virtual on schema: " + schemaVariableName);
            }
            else
                continue;
            const modelName = schemaModelMapping[schemaVariableName];
            if (!modelName) {
                if (process.env.DEBUG)
                    console.warn("tsreader: Associated model name not found for schema: " + schemaVariableName);
                continue;
            }
            const funcExpr = propAccessExpr
                ?.getParent()
                ?.getFirstChildByKind(SyntaxKind.FunctionExpression);
            const type = funcExpr?.getType()?.getText(funcExpr);
            const callExpr2 = propAccessExpr.getFirstChildByKind(SyntaxKind.CallExpression);
            const stringLiteral = callExpr2?.getArguments()[0];
            const propAccessExpr2 = callExpr2?.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
            if (propAccessExpr2?.getName() !== "virtual") {
                if (process.env.DEBUG) {
                    console.warn("tsreader: virtual found on schema does not have virtual initializer");
                }
                continue;
            }
            const virtualName = stringLiteral?.getText();
            let returnType = type?.split("=> ")?.[1];
            if (!returnType || !virtualName) {
                if (process.env.DEBUG)
                    console.warn("tsreader: virtualName or returnType not found: ", {
                        virtualName,
                        returnType
                    });
                continue;
            }
            /**
             * @experimental trying this out since certain virtual types are indeterminable and get set to void, which creates incorrect TS errors
             * This should be a fine workaround because virtual properties shouldn't return solely `void`, they return real values.
             */
            if (returnType === "void") {
                if (process.env.DEBUG) {
                    console.warn("tsreader: return type found as void, this usually means we couldn't determine the type");
                }
                returnType = "any";
            }
            const virtualNameSanitized = virtualName.slice(1, virtualName.length - 1);
            modelTypes[modelName].virtuals[virtualNameSanitized] = returnType;
        }
    }
    return modelTypes;
}
const parseModelInitializer = (d, isModelNamedImport) => {
    const callExpr = d.getFirstChildByKind(SyntaxKind.CallExpression);
    if (!callExpr)
        return undefined;
    const callExprStr = callExpr.getText().replace(/[\r\n\t ]/g, "");
    // if model is a named import, we can match this without `mongoose.` prefix
    const pattern = isModelNamedImport
        ? /model(?:<.+?>)?\(["'`](\w+)["'`],(\w+),?\)/
        : /mongoose\.model(?:<.+?>)?\(["'`](\w+)["'`],(\w+),?\)/;
    const modelInitMatch = callExprStr.match(pattern);
    if (!modelInitMatch) {
        if (process.env.DEBUG) {
            console.warn(`tsreader: Could not find model name in Mongoose model initialization: ${callExprStr}`);
        }
        return undefined;
    }
    const [, modelName, schemaVariableName] = modelInitMatch;
    return { modelName, schemaVariableName };
};
function initModelTypes(sourceFile, filePath) {
    if (process.env.DEBUG)
        console.log("tsreader: Searching file for Mongoose schemas: " + filePath);
    const modelTypes = {};
    const mongooseImport = sourceFile.getImportDeclaration("mongoose");
    let isModelNamedImport = false;
    mongooseImport?.getNamedImports().forEach((importSpecifier) => {
        if (importSpecifier.getText() === "model")
            isModelNamedImport = true;
    });
    sourceFile.getVariableDeclarations().forEach((d) => {
        const { modelName, schemaVariableName } = parseModelInitializer(d, isModelNamedImport) ?? {};
        if (!modelName || !schemaVariableName)
            return;
        const modelVariableName = d.getName();
        modelTypes[modelName] = {
            schemaVariableName,
            modelVariableName,
            filePath,
            methods: {},
            statics: {},
            query: {},
            virtuals: {},
            comments: []
        };
    });
    const defaultExportAssignment = sourceFile.getExportAssignment((d) => !d.isExportEquals());
    if (defaultExportAssignment) {
        const defaultModelInit = parseModelInitializer(defaultExportAssignment, isModelNamedImport);
        if (defaultModelInit) {
            modelTypes[defaultModelInit.modelName] = {
                schemaVariableName: defaultModelInit.schemaVariableName,
                filePath,
                methods: {},
                statics: {},
                query: {},
                virtuals: {},
                comments: []
            };
        }
    }
    if (process.env.DEBUG) {
        const schemaNames = Object.keys(modelTypes);
        if (schemaNames.length === 0)
            console.warn(`tsreader: No schema found in file. If a schema exists & is exported, it will still be typed but will use generic types for methods, statics, queries & virtuals`);
        else
            console.log("tsreader: Schemas found: " + schemaNames);
    }
    return modelTypes;
}
const getModelTypes = (modelsPaths, maxCommentDepth = 2) => {
    const project = new Project({});
    project.addSourceFilesAtPaths(modelsPaths);
    let allModelTypes = {};
    // TODO: ideally we only parse the files that we know have methods, statics, or virtuals.
    // Would save a lot of time
    modelsPaths.forEach((modelPath) => {
        const sourceFile = project.getSourceFileOrThrow(modelPath);
        let modelTypes = initModelTypes(sourceFile, modelPath);
        modelTypes = findTypesInFile(sourceFile, modelTypes);
        modelTypes = findCommentsInFile(sourceFile, modelTypes, maxCommentDepth);
        allModelTypes = {
            ...allModelTypes,
            ...modelTypes
        };
    });
    return allModelTypes;
};
const registerUserTs = async (basePath) => {
    const pathToSearch = basePath.endsWith(".json")
        ? basePath
        : path.join(basePath, "**/tsconfig.json");
    const files = glob.sync(pathToSearch, { ignore: "**/node_modules/**" });
    if (files.length === 0)
        throw new Error(`No tsconfig.json file found at path "${basePath}"`);
    else if (files.length > 1)
        throw new Error(`Multiple tsconfig.json files found. Please specify a more specific --project value.\nPaths found: ${files}`);
    const foundPath = path.join(process.cwd(), files[0]);
    // REMOVE ALL THE TS-NODE REGISTRATION CODE
    // The loader already handles TypeScript compilation
    // Only handle path aliases
    try {
        if (process.env.DEBUG) {
            console.log(`tsreader: Parsing tsconfig.json at path '${foundPath}' to search for 'paths' field`);
        }
        const tsConfig = parseTSConfig(foundPath);
        if (tsConfig?.compilerOptions?.paths) {
            const baseUrl = path.join(process.cwd(), tsConfig?.compilerOptions?.baseUrl ?? "");
            if (process.env.DEBUG) {
                console.log(`tsreader: Found 'paths' field in tsconfig.json, registering project with tsconfig-paths using baseUrl '${baseUrl}'`);
            }
            const { register: registerPaths } = await import('tsconfig-paths');
            const cleanup = registerPaths({
                baseUrl,
                paths: tsConfig.compilerOptions.paths
            });
            if (process.env.DEBUG) {
                console.log("tsreader: tsconfig-paths registered");
            }
            return cleanup;
        }
        return null;
    }
    catch (err) {
        throw new Error(`Error parsing your tsconfig.json file: ${err.message}`);
    }
};
function parseTSConfig(tsconfigFilePath) {
    const tsConfigString = fs.readFileSync(tsconfigFilePath, "utf8");
    const tsConfig = JSON.parse(stripJsonComments(tsConfigString));
    // Handle the case where the tsconfig.json file has a "extends" property
    if (tsConfig.extends) {
        // Resolve the path to the extended tsconfig.json file
        const extendedPath = resolve.sync(tsConfig.extends, {
            basedir: path.dirname(tsconfigFilePath)
        });
        // Read and merge paths from the extended tsconfig.json recursively
        const extendedConfig = parseTSConfig(extendedPath);
        // Merge paths from extendedConfig into tsConfig
        tsConfig.compilerOptions.paths = {
            ...extendedConfig.compilerOptions.paths,
            ...tsConfig.compilerOptions.paths
        };
        // We only want to set the base URL if its not already set, since the child tsconfig should always overwrite extended tsconfigs.
        // So the first child we find with a base URL be the final base URL
        if (extendedConfig.compilerOptions.baseUrl && !tsConfig.compilerOptions.baseUrl) {
            tsConfig.compilerOptions.baseUrl = extendedConfig.compilerOptions.baseUrl;
        }
    }
    return tsConfig;
}

const getConfigFromFile = (configPath) => {
    // if no path provided, check root path for mtgen.config.json file. If doesnt exist, return empty object.
    if (!configPath) {
        const defaultPath = path.join(process.cwd(), "mtgen.config.json");
        if (glob.sync(defaultPath).length === 0)
            return {};
        configPath = defaultPath;
    }
    const { dir, base } = path.parse(configPath);
    if (!base)
        configPath = path.join(dir, "mtgen.config.json");
    else if (base !== "mtgen.config.json") {
        throw new Error(`${base} is not a valid config filename. Ensure to provide a path to a mtgen.config.json file or its parent folder.`);
    }
    const rawConfig = fs.readFileSync(configPath, "utf8");
    return JSON.parse(rawConfig);
};
const getModelsPaths = (basePath) => {
    let modelsPaths;
    if (basePath && basePath !== "") {
        // base path, only check that path
        const { ext } = path.parse(basePath);
        // if path points to a folder, search for ts files in folder.
        const modelsFolderPath = ext === "" ? path.join(basePath, "*.ts") : basePath;
        modelsPaths = glob.sync(modelsFolderPath, {
            ignore: "**/node_modules/**"
        });
        if (modelsPaths.length === 0) {
            throw new Error(`No model files found found at path "${basePath}".`);
        }
        // Put any index files at the end of the array. This ensures that if an index.ts file re-exports models, the parser
        // picks up the models from the individual files and not the index.ts file so that the tsReader will also pick them up properly
        modelsPaths.sort((_a, b) => (b.endsWith("index.ts") ? -1 : 0));
    }
    else {
        // no base path, recursive search files in a `models/` folder
        const modelsFolderPath = `**/models/!(index).ts`;
        modelsPaths = glob.sync(modelsFolderPath, {
            ignore: "**/node_modules/**"
        });
        if (modelsPaths.length === 0) {
            throw new Error(`Recursive search could not find any model files at "**/models/!(index).ts". Please provide a path to your models folder.`);
        }
    }
    return modelsPaths.map((filename) => path.join(process.cwd(), filename));
};
const cleanOutputPath = (outputPath) => {
    const { dir, base, ext } = path.parse(outputPath);
    // if `ext` is not empty (meaning outputPath references a file and not a directory) and `ext` != ".ts", means user provided an ivalid filetype (must be a `.ts` file to support typescript interfaces and types)/
    if (ext !== "" && ext !== ".ts") {
        throw new Error("Invalid --ouput argument. Please provide either a folder pah or a Typescript file path.");
    }
    // if extension is empty, means a folder path was provided. Join dir and base to create that path. If filepath was passed, sets to enclosing folder.
    const folderPath = ext === "" ? path.join(dir, base) : dir;
    const genFileName = ext === "" ? "mongoose.gen.ts" : base;
    return path.join(folderPath, genFileName);
};

// I removed ESLINT usage since it doesnt seem to add much value and adds room for bugs.
// If we want to re-add it, we need to add a check to ensure someone has an eslint config before linting files
// and set eslint as an optional dependency
// import { ESLint } from "eslint";
// NOTE: this could be sped up by formatting the generated file string prior to writing (no need to write file then read it again here and re-write it)
const prettifyFiles = (filePaths) => {
    const config = prettier.resolveConfig.sync(process.cwd(), { useCache: true, editorconfig: true }) ?? {};
    filePaths.forEach((filePath) => {
        const ogContent = fs__default.readFileSync(filePath);
        const formattedContent = prettier.format(ogContent.toString(), {
            ...config,
            parser: "typescript"
        });
        fs__default.writeFileSync(filePath, formattedContent);
    });
};
// const fixFiles = async (_filePaths: string[]) => {
// const eslint = new ESLint({ fix: true });
// const results = await eslint.lintFiles(filePaths);
// await ESLint.outputFixes(results);
// };
const format = async (filePaths) => {
    prettifyFiles(filePaths);
    // await fixFiles(filePaths);
};

const MAIN_HEADER = `/* tslint:disable */\n/* eslint-disable */\n\n// ######################################## THIS FILE WAS GENERATED BY MONGOOSE-TSGEN ######################################## //\n\n// NOTE: ANY CHANGES MADE WILL BE OVERWRITTEN ON SUBSEQUENT EXECUTIONS OF MONGOOSE-TSGEN.`;
const MONGOOSE_IMPORT = `import mongoose from "mongoose";`;
const POPULATE_HELPERS = `/**
 * Check if a property on a document is populated:
 * \`\`\`
 * import { IsPopulated } from "../interfaces/mongoose.gen.ts"
 * 
 * if (IsPopulated<UserDocument["bestFriend"]>) { ... }
 * \`\`\`
 */
export function IsPopulated<T>(doc: T | mongoose.Types.ObjectId): doc is T {
  return doc instanceof mongoose.Document;
}

/**
 * Helper type used by \`PopulatedDocument\`. Returns the parent property of a string 
 * representing a nested property (i.e. \`friend.user\` -> \`friend\`)
 */
type ParentProperty<T> = T extends \`\${infer P}.\${string}\` ? P : never;

/**
* Helper type used by \`PopulatedDocument\`. Returns the child property of a string 
* representing a nested property (i.e. \`friend.user\` -> \`user\`).
*/
type ChildProperty<T> = T extends \`\${string}.\${infer C}\` ? C : never;

/**
* Helper type used by \`PopulatedDocument\`. Removes the \`ObjectId\` from the general union type generated 
* for ref documents (i.e. \`mongoose.Types.ObjectId | UserDocument\` -> \`UserDocument\`)
*/
type PopulatedProperty<Root, T extends keyof Root> = Omit<Root, T> & { 
  [ref in T]: Root[T] extends mongoose.Types.Array<infer U> ? 
    mongoose.Types.Array<Exclude<U, mongoose.Types.ObjectId>> :
    Exclude<Root[T], mongoose.Types.ObjectId> 
}

/**
 * Populate properties on a document type:
 * \`\`\`
 * import { PopulatedDocument } from "../interfaces/mongoose.gen.ts"
 *
 * function example(user: PopulatedDocument<UserDocument, "bestFriend">) {
 *   console.log(user.bestFriend._id) // typescript knows this is populated
 * }
 * \`\`\`
 */
export type PopulatedDocument<
DocType,
T
> = T extends keyof DocType
? PopulatedProperty<DocType, T> 
: (
    ParentProperty<T> extends keyof DocType
      ? Omit<DocType, ParentProperty<T>> &
      {
        [ref in ParentProperty<T>]: (
          DocType[ParentProperty<T>] extends mongoose.Types.Array<infer U> ? (
            mongoose.Types.Array<
              ChildProperty<T> extends keyof U 
                ? PopulatedProperty<U, ChildProperty<T>> 
                : PopulatedDocument<U, ChildProperty<T>>
            >
          ) : (
            ChildProperty<T> extends keyof DocType[ParentProperty<T>]
            ? PopulatedProperty<DocType[ParentProperty<T>], ChildProperty<T>>
            : PopulatedDocument<DocType[ParentProperty<T>], ChildProperty<T>>
          )
        )
      }
      : DocType
  )

`;
const QUERY_POPULATE = `/**
 * Helper types used by the populate overloads
 */
type Unarray<T> = T extends Array<infer U> ? U : T;
type Modify<T, R> = Omit<T, keyof R> & R;

/**
 * Augment mongoose with Query.populate overloads
 */
declare module "mongoose" {
  interface Query<ResultType, DocType, THelpers = {}> {
    populate<T extends string>(path: T, select?: string | any, model?: string | Model<any, THelpers>, match?: any): Query<
      ResultType extends Array<DocType> ? Array<PopulatedDocument<Unarray<ResultType>, T>> : (ResultType extends DocType ? PopulatedDocument<Unarray<ResultType>, T> : ResultType),
      DocType,
      THelpers
    > & THelpers;

    populate<T extends string>(options: Modify<PopulateOptions, { path: T }> | Array<PopulateOptions>): Query<
      ResultType extends Array<DocType> ? Array<PopulatedDocument<Unarray<ResultType>, T>> : (ResultType extends DocType ? PopulatedDocument<Unarray<ResultType>, T> : ResultType),
      DocType,
      THelpers
    > & THelpers;
  }
}`;
const getObjectDocs = (modelName) => `/**
 * Lean version of ${modelName}Document (type alias of \`${modelName}\`)
 * 
 * Use this type alias to avoid conflicts with model names:
 * \`\`\`
 * import { ${modelName} } from "../models"
 * import { ${modelName}Object } from "../interfaces/mongoose.gen.ts"
 * 
 * const ${modelName.toLowerCase()}Object: ${modelName}Object = ${modelName.toLowerCase()}.toObject();
 * \`\`\`
 */`;
const getQueryDocs = () => `/**
 * Mongoose Query type
 * 
 * This type is returned from query functions. For most use cases, you should not need to use this type explicitly.
 */`;
const getQueryHelpersDocs = (modelName) => `/**
 * Mongoose Query helper types
 * 
 * This type represents \`${modelName}Schema.query\`. For most use cases, you should not need to use this type explicitly.
 */`;
const getModelDocs = (modelName) => `/**
 * Mongoose Model type
 * 
 * Pass this type to the Mongoose Model constructor:
 * \`\`\`
 * const ${modelName} = mongoose.model<${modelName}Document, ${modelName}Model>("${modelName}", ${modelName}Schema);
 * \`\`\`
 */`;
const getDocumentDocs = (modelName) => `/**
 * Mongoose Document type
 * 
 * Pass this type to the Mongoose Model constructor:
 * \`\`\`
 * const ${modelName} = mongoose.model<${modelName}Document, ${modelName}Model>("${modelName}", ${modelName}Schema);
 * \`\`\`
 */`;
const getSchemaDocs = (modelName) => `/**
 * Mongoose Schema type
 * 
 * Assign this type to new ${modelName} schema instances:
 * \`\`\`
 * const ${modelName}Schema: ${modelName}Schema = new mongoose.Schema({ ... })
 * \`\`\`
 */`;
// If model is a subdoc, pass `fullName`
const getLeanDocs = (modelName, fullName) => `/**
 * Lean version of ${fullName ?? modelName}Document
 * 
 * This has all Mongoose getters & functions removed. This type will be returned from \`${modelName}Document.toObject()\`.${!fullName || modelName === fullName ?
    ` To avoid conflicts with model names, use the type alias \`${modelName}Object\`.` :
    ""}
 * \`\`\`
 * const ${modelName.toLowerCase()}Object = ${modelName.toLowerCase()}.toObject();
 * \`\`\`
 */`;
const getSubdocumentDocs = (modelName, path) => `/**
 * Mongoose Subdocument type
 * 
 * Type of \`${modelName}Document["${path}"]\` element.
 */`;

/**
 * TypeScript keywords categorized by their usage context. (where I got the list)
 * @see {@link https://github.com/microsoft/TypeScript/issues/2536 TS Reserved Words}
 */
/**
 * Regular JavaScript/TypeScript reserved words that cannot be used as identifiers in any context.
 * These are the core keywords that form the basic syntax and control flow of the language.
 * Using these as identifiers will always result in a syntax error.
 *
 * @example
 * // These will cause syntax errors:
 * type if = string;    // Error: 'if' is a reserved word
 * interface class {}   // Error: 'class' is a reserved word
 */
const tsReservedWords = [
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "null",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with"
];
/**
 * Additional reserved words that include both JavaScript strict mode keywords
 * and TypeScript-specific modifiers. These cannot be used as identifiers in
 * strict mode or when using TypeScript features.
 *
 * @example
 * // These will cause errors:
 * let interface = "foo";     // Error: 'interface' is reserved
 */
const tsStrictModeReservedWords = [
    "as",
    "implements",
    "interface",
    "let",
    "package",
    "private",
    "protected",
    "public",
    "static",
    "yield"
];
/**
 * Contextual keywords that have special meaning in certain contexts but can be used as identifiers.
 * These keywords need to be handled carefully during type generation to avoid creating invalid TypeScript.
 *
 * @example
 * // These would create invalid type definitions:
 * type type = string;        // Error: 'type' is a contextual keyword
 * interface get<T> {}        // Error: 'get' cannot be used as an interface name
 * type async<T> = T;        // Error: 'async' cannot be used as a type alias
 */
const tsContextualKeywords = [
    "any",
    "async",
    "await",
    "boolean",
    "constructor",
    "declare",
    "get",
    "infer",
    "is",
    "keyof",
    "module",
    "namespace",
    "never",
    "readonly",
    "require",
    "number",
    "set",
    "string",
    "symbol",
    "type",
    "from",
    "of",
    "unknown",
    "undefined",
    "unique",
    "global"
];
/**
 * Combined array of all TypeScript keywords, including reserved words,
 * strict mode reserved words, and contextual keywords.
 * This comprehensive list can be used when checking if a string is any kind
 * of TypeScript keyword.
 */
const tsReservedKeywords = [
    ...tsReservedWords,
    ...tsStrictModeReservedWords,
    ...tsContextualKeywords
];
/**
 * Regex pattern that matches any character that is not a valid TypeScript identifier character.
 * Used to split strings into parts that could form valid identifiers.
 * Valid characters are: a-z, A-Z, 0-9, underscore (_), and dollar sign ($)
 */
const TS_IDENTIFIER_SEPARATOR_REGEX = /[^a-zA-Z0-9_$]+/;
/**
 * Regex pattern that matches invalid TypeScript identifier characters.
 * Used to clean individual parts of an identifier.
 * Matches anything that is not: a-z, A-Z, 0-9, underscore (_), or dollar sign ($)
 */
const TS_INVALID_CHAR_REGEX = /[^a-zA-Z0-9_$]/g;
/**
 * Regex pattern that matches invalid starting characters for TypeScript identifiers.
 * Used to ensure the first part of an identifier starts with a valid character.
 * Matches any characters that are not: a-z, A-Z, underscore (_), or dollar sign ($)
 */
const TS_INVALID_START_REGEX = /^[^a-zA-Z_$]+/;

const convertKeyValueToLine = ({ key, valueType, isOptional = false, newline = true }) => {
    let line = "";
    if (key) {
        // Check if the key is a valid TypeScript identifier:
        // 1. Must start with a letter, underscore, or dollar sign
        // 2. Can contain letters, numbers, underscores, or dollar signs
        // 3. Cannot be a reserved keyword
        const isValidTsIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) && !tsReservedKeywords.includes(key);
        line += isValidTsIdentifier ? key : JSON.stringify(key);
        if (isOptional)
            line += "?";
        line += ": ";
    }
    line += valueType + ";";
    if (newline)
        line += "\n";
    return line;
};

const getSubdocName = (path, modelName = "") => {
    let subDocName = modelName +
        path
            .split(".")
            .map((p) => p[0].toUpperCase() + p.slice(1))
            .join("");
    subDocName = pluralize.singular(subDocName);
    // // If a user names a field "model", it will conflict with the model name, so we need to rename it.
    // // https://github.com/francescov1/mongoose-tsgen/issues/128
    if (subDocName === `${modelName}Model`) {
        // NOTE: This wasnt behavior for usage from getTypeFromKeyValue, but it should probably be here anyways.
        // If causes issues, add a param to control it
        subDocName += "Field";
    }
    return subDocName;
};
const isMapType = (val) => {
    return val === Map || val === mongoose.Schema.Types.Map;
};
const convertBaseTypeToTs = ({ key, val, isDocument, noMongoose, datesAsStrings }) => {
    // NOTE: ideally we check actual type of value to ensure its Schema.Types.Mixed (the same way we do with Schema.Types.ObjectId),
    // but this doesnt seem to work for some reason
    // {} is treated as Mixed
    if (val.schemaName === "Mixed" ||
        val.type?.schemaName === "Mixed" ||
        (val.constructor === Object && _.isEmpty(val)) ||
        (val.type?.constructor === Object && _.isEmpty(val.type))) {
        return "any";
    }
    const isMap = isMapType(val.type);
    const mongooseType = isMap ? val.of : val.type;
    // If the user specifies a map with no type, we set to any
    if (isMap && !mongooseType) {
        return "any";
    }
    switch (mongooseType) {
        case mongoose.Schema.Types.String:
        case String:
        case "String":
            // NOTE: This handles the `enum` field being both an array of values and being a TS enum (so that we can support this feature: https://github.com/Automattic/mongoose/issues/9546)
            if (val.enum && Object.values(val.enum)?.length > 0) {
                // User passed a typescript enum to the enum property of the String field config.
                const enumValues = Object.values(val.enum);
                const includesNull = enumValues.includes(null);
                const enumValuesWithoutNull = enumValues.filter((str) => str !== null);
                let enumTypscriptType = `"` + enumValuesWithoutNull.join(`" | "`) + `"`;
                if (includesNull)
                    enumTypscriptType += ` | null`;
                return enumTypscriptType;
            }
            return "string";
        case mongoose.Schema.Types.Number:
        case Number:
        case "Number":
            return key === "__v" ? undefined : "number";
        case mongoose.Schema.Types.Decimal128:
        case mongoose.Types.Decimal128:
            return isDocument ? "mongoose.Types.Decimal128" : "number";
        case mongoose.Schema.Types.Boolean:
        case Boolean:
        case "Boolean":
            return "boolean";
        case mongoose.Schema.Types.Date:
        case Date:
        case "Date":
            return datesAsStrings ? "string" : "Date";
        case mongoose.Types.Buffer:
        case mongoose.Schema.Types.Buffer:
        case Buffer:
        case "Buffer":
            return isDocument ? "mongoose.Types.Buffer" : "Buffer";
        case mongoose.Schema.Types.ObjectId:
        case mongoose.Types.ObjectId:
        case "ObjectId": // _id fields have type set to the string "ObjectId"
            return noMongoose ? "string" : "mongoose.Types.ObjectId";
        case Object:
            return "any";
        default:
            if (_.isPlainObject(val)) {
                // This indicates to the parent func that this type is nested and we need to traverse one level deeper
                return "{}";
            }
            console.warn(`parser: Unknown type detected for field "${key}", using type "any". Please create an issue in the mongoose-tsgen GitHub repo to have this case handled.`);
            return "any";
    }
};
const getShouldLeanIncludeVirtuals = (schema) => {
    // Check the toObject options to determine if virtual property should be included.
    // See https://mongoosejs.com/docs/api.html#document_Document-toObject for toObject option documentation.
    const toObjectOptions = schema.options?.toObject ?? {};
    if ((!toObjectOptions.virtuals && !toObjectOptions.getters) ||
        (toObjectOptions.virtuals === false && toObjectOptions.getters === true))
        return false;
    return true;
};
const BASE_TYPES = new Set([
    Object,
    String,
    "String",
    Number,
    "Number",
    Boolean,
    "Boolean",
    Date,
    "Date",
    Buffer,
    "Buffer",
    Map,
    mongoose.Schema.Types.String,
    mongoose.Schema.Types.Number,
    mongoose.Schema.Types.Boolean,
    mongoose.Schema.Types.Date,
    mongoose.Schema.Types.Map,
    mongoose.Types.Buffer,
    mongoose.Schema.Types.Buffer,
    mongoose.Schema.Types.ObjectId,
    mongoose.Types.ObjectId,
    mongoose.Types.Decimal128,
    mongoose.Schema.Types.Decimal128
]);
const loadModels = async (modelsPaths) => {
    const nameToModelMap = {};
    const checkAndRegisterModel = (obj) => {
        if (!obj?.modelName || !obj?.schema)
            return false;
        nameToModelMap[obj.modelName] = obj;
        return true;
    };
    // Change from forEach to for...of
    for (const singleModelPath of modelsPaths) {
        let exportedData;
        try {
            if (process.env.DEBUG) {
                console.log("parser: Attempting to import model from path: " + singleModelPath);
            }
            exportedData = await import(pathToFileURL(singleModelPath).href);
            if (process.env.DEBUG) {
                console.log("parser: Successfully imported:", Object.keys(exportedData));
            }
        }
        catch (err) {
            const error = err.message?.includes(`Cannot find module '${singleModelPath}'`)
                ? new Error(`Could not find a module at path ${singleModelPath}.`)
                : err;
            throw error;
        }
        const prevSchemaCount = Object.keys(nameToModelMap).length;
        checkAndRegisterModel(exportedData);
        for (const obj of Object.values(exportedData)) {
            checkAndRegisterModel(obj);
        }
        const schemaCount = Object.keys(nameToModelMap).length - prevSchemaCount;
        if (schemaCount === 0) {
            console.warn(`A module was found at ${singleModelPath}, but no new exported models were found. If this file contains a Mongoose schema, ensure it is exported and its name does not conflict with others.`);
        }
    }
    return Object.values(nameToModelMap);
};
// TODO: This is one of the most complex functions, and should be refactored.
// TODO: May want to splti up the string building with the type extraction
const getTypeFromKeyValue = ({ key, val: valOriginal, isDocument, shouldLeanIncludeVirtuals, noMongoose, datesAsStrings }) => {
    // if the value is an object, we need to deepClone it to ensure changes to `val` aren't persisted in parent function
    let val = _.isPlainObject(valOriginal) ? _.cloneDeep(valOriginal) : valOriginal;
    let valueType;
    const requiredValue = Array.isArray(val.required) ? val.required[0] : val.required;
    let isOptional = requiredValue !== true;
    let isArray = Array.isArray(val);
    let isUntypedArray = false;
    let isMapOfArray = false;
    /**
     * If _isDefaultSetToUndefined is set, it means this is a subdoc array with `default: undefined`, indicating that mongoose will not automatically
     * assign an empty array to the value. Therefore, isOptional = true. In other cases, isOptional is false since the field will be automatically initialized
     * with an empty array
     */
    const isArrayOuterDefaultSetToUndefined = Boolean(val._isDefaultSetToUndefined);
    // this means its a subdoc
    if (isArray) {
        val = val[0];
        if (val === undefined && val?.type === undefined) {
            isUntypedArray = true;
            isOptional = isArrayOuterDefaultSetToUndefined ?? false;
        }
        else {
            isOptional = val._isDefaultSetToUndefined ?? false;
        }
        // Array optionality is a bit overcomplicated, see https://github.com/francescov1/mongoose-tsgen/issues/124.
        // If user explicitely sets required: false, we override our logic and assume they know best.
        if (requiredValue === false) {
            isOptional = true;
        }
    }
    else if (Array.isArray(val.type)) {
        val.type = val.type[0];
        isArray = true;
        if (val.type === undefined) {
            isUntypedArray = true;
            isOptional = isArrayOuterDefaultSetToUndefined ?? false;
        }
        else if (val.type.type) {
            /**
             * Arrays can also take the following format.
             * This is used when validation needs to be done on both the element itself and the full array.
             * This format implies `required: true`.
             *
             * ```
             * friends: {
             *   type: [
             *     {
             *       type: Schema.Types.ObjectId,
             *       ref: "User",
             *       validate: [
             *         function(userId: mongoose.Types.ObjectId) { return !this.friends.includes(userId); }
             *       ]
             *     }
             *   ],
             *   validate: [function(val) { return val.length <= 3; } ]
             * }
             * ```
             */
            if (val.type.ref)
                val.ref = val.type.ref;
            val.type = val.type.type;
            isOptional = false;
        }
        else if (val.index === "2dsphere") {
            // 2dsphere index is a special edge case which does not have an inherent default value of []
            isOptional = true;
        }
        else if ("default" in val && val.default === undefined && requiredValue !== true) {
            // If default: undefined, it means the field should not default with an empty array.
            isOptional = true;
        }
        else {
            isOptional = isArrayOuterDefaultSetToUndefined;
        }
        // Array optionality is a bit overcomplicated, see https://github.com/francescov1/mongoose-tsgen/issues/124.
        // If user explicitely sets required: false, we override our logic and assume they know best.
        if (requiredValue === false) {
            isOptional = true;
        }
    }
    if (BASE_TYPES.has(val))
        val = { type: val };
    const isMap = isMapType(val?.type);
    // // handles maps of arrays as per https://github.com/francescov1/mongoose-tsgen/issues/63
    if (isMap && Array.isArray(val.of)) {
        val.of = val.of[0];
        isMapOfArray = true;
        isArray = true;
    }
    if (val === Array || val?.type === Array || isUntypedArray) {
        // treat Array constructor and [] as an Array<Mixed>
        isArray = true;
        valueType = "any";
        isOptional = isArrayOuterDefaultSetToUndefined ?? false;
        // Array optionality is a bit overcomplicated, see https://github.com/francescov1/mongoose-tsgen/issues/124.
        // If user explicitely sets required: false, we override our logic and assume they know best.
        if (requiredValue === false) {
            isOptional = true;
        }
    }
    else if (val._inferredInterfaceName) {
        valueType = val._inferredInterfaceName + (isDocument ? "Document" : "");
    }
    else if (isMap && val.of?._inferredInterfaceName) {
        valueType = val.of._inferredInterfaceName + (isDocument ? "Document" : "");
        isOptional = val.of.required !== true;
    }
    else if (val.path && val.path && val.setters && val.getters) {
        // check for virtual properties
        // skip id property
        if (key === "id")
            return "";
        // if not lean doc and lean docs shouldnt include virtuals, ignore entry
        if (!isDocument && !shouldLeanIncludeVirtuals)
            return "";
        // If the val has the _aliasRootField property, it means this field is an alias for another field, and _aliasRootField contains the other field's type.
        // So we can re-call this function using _aliasRootField.
        if (val._aliasRootField) {
            return getTypeFromKeyValue({
                key,
                val: val._aliasRootField,
                isDocument,
                shouldLeanIncludeVirtuals,
                noMongoose,
                datesAsStrings
            });
        }
        valueType = "any";
        isOptional = false;
    }
    else if (key &&
        [
            "get",
            "set",
            "schemaName",
            "_defaultCaster",
            "defaultOptions",
            "_checkRequired",
            "_cast",
            "checkRequired",
            "cast",
            "__v"
        ].includes(key)) {
        return "";
    }
    else if (val.ref) {
        let docRef = val.ref.replace?.(`'`, "");
        if (typeof val.ref === "function") {
            if (noMongoose) {
                valueType = "string";
            }
            else {
                // If we get a function, we cant determine the document that we would populate, so just assume it's an ObjectId
                valueType = "mongoose.Types.ObjectId";
                // If generating the document version, we can also provide document as an option to reflect the populated case. But for
                // lean docs we can't do this cause we don't have a base type to extend from (since we can't determine it when parsing only JS).
                // Later the tsReader can implement a function typechecker to subtitute the type with the more exact one.
                if (isDocument) {
                    valueType += " | mongoose.Document";
                }
            }
        }
        else if (docRef) {
            // If val.ref is an invalid type (not a string) then this gets skipped.
            if (docRef.includes(".")) {
                docRef = getSubdocName(docRef);
            }
            const populatedType = isDocument ? `${docRef}Document` : docRef;
            valueType = val.autopopulate // support for mongoose-autopopulate
                ? populatedType
                : `${populatedType}["_id"] | ${populatedType}`;
        }
    }
    else {
        // _ids are always required
        if (key === "_id")
            isOptional = false;
        const convertedType = convertBaseTypeToTs({
            key,
            val,
            isDocument,
            noMongoose,
            datesAsStrings
        });
        // TODO: we should detect nested types from unknown types and handle differently.
        // Currently, if we get an unknown type (ie not handled) then users run into a "max callstack exceeded error"
        if (convertedType === "{}") {
            const nestedSchema = _.cloneDeep(val);
            valueType = "{\n";
            Object.keys(nestedSchema).forEach((key) => {
                valueType += getTypeFromKeyValue({
                    key,
                    val: nestedSchema[key],
                    isDocument,
                    shouldLeanIncludeVirtuals,
                    noMongoose,
                    datesAsStrings
                });
            });
            valueType += "}";
            isOptional = false;
        }
        else {
            valueType = convertedType;
        }
    }
    if (!valueType)
        return "";
    if (isMap && !isMapOfArray)
        valueType = isDocument ? `mongoose.Types.Map<${valueType}>` : `Map<string, ${valueType}>`;
    if (isArray) {
        if (isDocument)
            valueType = `mongoose.Types.${val._isSubdocArray ? "Document" : ""}Array<` + valueType + ">";
        else {
            // if valueType includes a space, likely means its a union type (ie "number | string") so lets wrap it in brackets when adding the array to the type
            if (valueType.includes(" "))
                valueType = `(${valueType})`;
            valueType = `${valueType}[]`;
        }
    }
    // a little messy, but if we have a map of arrays, we need to wrap the value after adding the array info
    if (isMap && isMapOfArray)
        valueType = isDocument ? `mongoose.Types.Map<${valueType}>` : `Map<string, ${valueType}>`;
    if (val?.default === null) {
        valueType += " | null";
    }
    return convertKeyValueToLine({ key, valueType, isOptional });
};

/**
 * Parser types
 */
// old TODOs:
// - Handle statics method issue
// - Switch to using HydratedDocument, https://mongoosejs.com/docs/migrating_to_7.html. Also update query helpers https://mongoosejs.com/docs/typescript/query-helpers.html
// TODO: Look into new inference of types https://mongoosejs.com/docs/typescript/schemas.html
class ParserSchema {
    modelName;
    model; // TODO: Can we get better types here?
    mongooseSchema;
    fields;
    methods = {};
    statics = {};
    queries = {};
    virtuals = {};
    comments = [];
    // schema.tree with custom field _aliasRootField, TODO: Create explicit type for this
    schemaTree = {};
    shouldLeanIncludeVirtuals;
    childSchemas;
    constructor({ mongooseSchema, modelName, model }) {
        this.model = model;
        this.modelName = modelName;
        this.mongooseSchema = mongooseSchema;
        this.childSchemas = this.parseChildSchemas(mongooseSchema);
        this.schemaTree = this.parseTree(mongooseSchema);
        this.fields = this.generateFields(mongooseSchema);
        this.shouldLeanIncludeVirtuals = getShouldLeanIncludeVirtuals(mongooseSchema);
    }
    // TODO: Generate own representation
    generateFields(_mongooseSchema) {
        // return Object.entries(mongooseSchema.tree).map(([name, field]) => ({
        //   name: field.name,
        //   type: field.type,
        //   isOptional: field.isOptional || false,
        //   isArray: field.isArray || false,
        //   isMap: field.isMap || false,
        //   ref: field.ref,
        //   virtual: field.virtual,
        //   comment: field.comment
        // }));
        return [];
    }
    generateTemplate({ isDocument, noMongoose, datesAsStrings, header, footer }) {
        let template = "";
        if (this.mongooseSchema.childSchemas && this.modelName) {
            // TODO: Splint into functuon
            this.childSchemas.forEach((child) => {
                const path = child.model.path;
                const name = getSubdocName(path, this.modelName);
                let header = "";
                if (isDocument)
                    // TODO: Does this make sense for child docs?
                    header += child.mongooseSchema._isSubdocArray
                        ? getSubdocumentDocs(this.modelName, path)
                        : getDocumentDocs(this.modelName);
                else
                    header += getLeanDocs(this.modelName, name);
                header += "\nexport ";
                if (isDocument) {
                    header += `type ${name}Document = `;
                    // get type of _id to pass to mongoose.Document
                    // this is likely unecessary, since non-subdocs are not allowed to have option _id: false (https://mongoosejs.com/docs/guide.html#_id)
                    // TODO: Fix type manually
                    const _idType = child.mongooseSchema.tree._id
                        ? convertBaseTypeToTs({
                            key: "_id",
                            val: child.mongooseSchema.tree._id,
                            isDocument: true,
                            noMongoose,
                            datesAsStrings
                        })
                        : "any";
                    // TODO: this should extend `${name}Methods` like normal docs, but generator will only have methods, statics, etc. under the model name, not the subdoc model name
                    // so after this is generated, we should do a pass and see if there are any child schemas that have non-subdoc definitions.
                    // or could just wait until we dont need duplicate subdoc versions of docs (use the same one for both embedded doc and non-subdoc)
                    header += child.mongooseSchema._isSubdocArray
                        ? `mongoose.Types.Subdocument<${_idType}>`
                        : `mongoose.Document<${_idType}>`;
                    header += " & {\n";
                }
                else
                    header += `type ${name} = {\n`;
                const footer = `}\n\n`;
                template += child.generateTemplate({
                    isDocument,
                    noMongoose,
                    datesAsStrings,
                    header,
                    footer
                });
            });
        }
        template += header;
        Object.entries(this.schemaTree).forEach(([key, val]) => {
            template += getTypeFromKeyValue({
                key,
                val,
                isDocument,
                noMongoose,
                datesAsStrings,
                shouldLeanIncludeVirtuals: this.shouldLeanIncludeVirtuals
            });
        });
        template += footer;
        return template;
    }
    /**
     * Parses the schema tree, and adds _aliasRootField to the tree for aliases.
     * @param schema The schema to parse.
     * @returns The parsed schema tree.
     */
    parseTree = (schema) => {
        const tree = _.cloneDeep(schema.tree);
        // TODO: Rename this to what it was before, related to adding type aliases
        // Add alias types to tree
        if (!_.isEmpty(this.mongooseSchema.aliases) && this.modelName) {
            Object.entries(this.mongooseSchema.aliases).forEach(([alias, path]) => {
                _.set(tree, `${alias}._aliasRootField`, _.get(tree, path));
            });
        }
        return tree;
    };
    parseChildSchemas = (schema) => {
        const childSchemas = [];
        // NOTE: The for loop below is a hack for Schema maps. For some reason, when a map of a schema exists, the schema is not included
        // in childSchemas. So we add it manually and add a few extra properties to ensure the processChild works correctly.
        // UPDSTE: Newer versions of Mongoose do include the schema map in the child schemas, but in a weird format with "*$" postfix in the path. We can just filter those out which is what were doing directly below.
        const mongooseChildSchemas = _.cloneDeep(schema.childSchemas).filter((child) => !child.model.path.endsWith("$*"));
        for (const [path, type] of Object.entries(this.mongooseSchema.paths)) {
            // This check tells us that this is a map of a separate schema
            if (type?.$isSchemaMap && type?.$__schemaType.schema) {
                const childSchema = type.$__schemaType;
                childSchema.model = {
                    path: path,
                    // TODO: Augment the mongoose schema with these, or dont update them in place would be even better
                    $isArraySubdocument: childSchema.Constructor?.$isArraySubdocument ??
                        childSchema.$isMongooseDocumentArray ??
                        false,
                    $isSchemaMap: true
                };
                mongooseChildSchemas.push(childSchema);
            }
        }
        for (const child of mongooseChildSchemas) {
            const path = child.model.path;
            const isSubdocArray = child.model.$isArraySubdocument;
            const isSchemaMap = child.model.$isSchemaMap ?? false;
            const name = getSubdocName(path, this.modelName);
            const sanitizedName = sanitizeModelName(name);
            child.schema._isReplacedWithSchema = true;
            child.schema._inferredInterfaceName = sanitizedName;
            child.schema._isSubdocArray = isSubdocArray;
            child.schema._isSchemaMap = isSchemaMap;
            const requiredValuePath = `${path}.required`;
            if (_.get(this.mongooseSchema.tree, requiredValuePath) === true) {
                child.schema.required = true;
            }
            /**
             * for subdocument arrays, mongoose supports passing `default: undefined` to disable the default empty array created.
             * here we indicate this on the child schema using _isDefaultSetToUndefined so that the parser properly sets the `isOptional` flag
             */
            if (isSubdocArray) {
                const defaultValuePath = `${path}.default`;
                if (_.has(this.mongooseSchema.tree, defaultValuePath) &&
                    _.get(this.mongooseSchema.tree, defaultValuePath) === undefined) {
                    child.schema._isDefaultSetToUndefined = true;
                }
            }
            if (isSchemaMap) {
                _.set(this.mongooseSchema.tree, path, {
                    type: Map,
                    of: isSubdocArray ? [child.schema] : child.schema
                });
            }
            else if (isSubdocArray) {
                _.set(this.mongooseSchema.tree, path, [child.schema]);
            }
            else {
                _.set(this.mongooseSchema.tree, path, child.schema);
            }
            const childSchema = new ParserSchema({
                mongooseSchema: child.schema,
                modelName: sanitizedName,
                model: child.model
            });
            childSchemas.push(childSchema);
        }
        return childSchemas;
    };
}

/**
 * Converts a string into a valid TypeScript type identifier by:
 * 1. Validating input
 * 2. Splitting on non-alphanumeric characters
 * 3. Removing invalid characters
 * 4. Ensuring valid start characters (letters, _, $)
 * 5. Converting to PascalCase
 *
 * @param input - The string to convert into a valid TypeScript type identifier
 * @returns A valid TypeScript type identifier in PascalCase
 * @throws {TypeError} If the input is not a string
 * @throws {Error} If the input is empty or results in an empty string after processing
 *
 * @example
 * // Basic conversion
 * sanitizeTypeIdentifier("hello world")      // Returns "HelloWorld"
 * sanitizeTypeIdentifier("my-component-123") // Returns "MyComponent123"
 *
 * @example
 * // Edge cases
 * sanitizeTypeIdentifier("123-invalid")     // Returns "Invalid"
 * sanitizeTypeIdentifier("user.profile")    // Returns "UserProfile"
 * sanitizeTypeIdentifier("$special_case")   // Returns "SpecialCase"
 * sanitizeTypeIdentifier("  trimmed  ")     // Returns "Trimmed"
 */
function sanitizeTypeIdentifier(input) {
    // Input validation
    if (typeof input !== "string") {
        throw new TypeError(`Model name must be a string, received: ${typeof input}`);
    }
    const trimmedInput = input.trim();
    if (!trimmedInput) {
        throw new Error("Type identifier cannot be empty");
    }
    // Check if input is a reserved keyword
    if (tsReservedKeywords.includes(trimmedInput)) {
        throw new Error(`Invalid model name: "${trimmedInput}" - cannot use TypeScript reserved keyword`);
    }
    // Split by common separators and filter out empty strings
    const parts = trimmedInput.split(TS_IDENTIFIER_SEPARATOR_REGEX).filter(Boolean);
    // Process each part
    const sanitizedParts = parts
        .map((part, index) => {
        // Remove invalid characters
        const cleaned = part.replace(TS_INVALID_CHAR_REGEX, "");
        // For first part: remove leading numbers/invalid characters
        // For other parts: keep numbers (even at start)
        const validStart = index === 0 ? cleaned.replace(TS_INVALID_START_REGEX, "") : cleaned;
        // Capitalize first letter if it exists
        return validStart.charAt(0).toUpperCase() + validStart.slice(1);
    })
        .filter(Boolean); // Remove any parts that became empty after cleaning
    // Check if first character is a number
    if (/^\d/.test(trimmedInput)) {
        throw new Error(`Invalid model name: "${trimmedInput}" - type name cannot start with a number`);
    }
    // Ensure we have valid parts after processing
    if (sanitizedParts.length === 0) {
        throw new Error(`Invalid model name: "${trimmedInput}" - results in invalid TypeScript identifier ""`);
    }
    return sanitizedParts.join("");
}

// TODO next: Pull this file apart. Create a new "file writer" file, move all the ts stuff somewhere else,
const cleanComment = (comment) => {
    if (!comment)
        return "";
    if (comment.trim() === "/** */")
        return "";
    return comment
        .replace(/^\/\*\*[^\S\r\n]?/, "") // Remove opening /**
        .replace(/[^\S\r\n]+\*\s/g, "") // Remove * at start of lines
        .replace(/(\n)?[^\S\r\n]+\*\/$/, ""); // Remove closing */
};
// Needs to be exported by generator Module
const sanitizeModelName = (name) => sanitizeTypeIdentifier(name);
const funcTypeToThisSuffix = {
    query: "Query",
    methods: "Document",
    statics: "Model"
};
const parseSignature = (signature, modelName, funcType) => {
    const thisSuffix = funcTypeToThisSuffix[funcType];
    const thisType = `${modelName}${thisSuffix}`;
    const queryReturnType = `${modelName}Query`;
    const match = signature?.match(/\((?:this: \w*(?:, )?)?(?<params>.*)\) => (?<returnType>.*)/);
    if (!match?.groups) {
        console.warn(`Failed to extract types from function signature: ${signature}, falling back to defaults`);
        const defaultReturnType = funcType === "query" ? queryReturnType : "any";
        const defaultParams = "...args: any[]";
        return {
            params: defaultParams,
            returnType: defaultReturnType,
            thisType
        };
    }
    const finalReturnType = funcType === "query" ? queryReturnType : match.groups.returnType;
    return {
        params: match.groups.params,
        returnType: finalReturnType,
        thisType
    };
};
const convertFuncSignatureToType = (funcSignature, funcType, modelName) => {
    const sanitizedModelName = sanitizeModelName(modelName);
    const { params, returnType, thisType } = parseSignature(funcSignature, sanitizedModelName, funcType);
    const paramsString = params?.length > 0 ? `, ${params}` : "";
    return `(this: ${thisType}${paramsString}) => ${returnType}`;
};
const replaceModelTypes = (sourceFile, modelTypes, models) => {
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
            const { schema } = models.find((model) => model.modelName === modelName);
            const leanProperties = getShouldLeanIncludeVirtuals(schema) &&
                sourceFile
                    ?.getTypeAlias(`${sanitizedModelName}`)
                    ?.getFirstChildByKind(SyntaxKind.TypeLiteral)
                    ?.getChildrenOfKind(SyntaxKind.PropertySignature);
            if (documentProperties || leanProperties) {
                virtualNames.forEach((virtualName) => {
                    const virtualNameComponents = virtualName.split(".");
                    let nestedDocProps;
                    let nestedLeanProps;
                    virtualNameComponents.forEach((nameComponent, i) => {
                        if (i === virtualNameComponents.length - 1) {
                            if (documentProperties) {
                                const docPropMatch = (nestedDocProps ?? documentProperties).find((prop) => prop.getName() === nameComponent);
                                docPropMatch?.setType(virtuals[virtualName]);
                            }
                            if (leanProperties) {
                                const leanPropMatch = (nestedLeanProps ?? leanProperties).find((prop) => prop.getName() === nameComponent);
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
                let nestedDocProps;
                let nestedLeanProps;
                pathComponents.forEach((nameComponent, i) => {
                    if (i === pathComponents.length - 1) {
                        if (documentProperties) {
                            const docPropMatch = (nestedDocProps ?? documentProperties).find((prop) => prop.getName() === nameComponent);
                            docPropMatch?.addJsDoc(cleanComment(comment));
                        }
                        if (leanProperties) {
                            const leanPropMatch = (nestedLeanProps ?? leanProperties).find((prop) => prop.getName() === nameComponent);
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
const addPopulateHelpers = (sourceFile) => {
    sourceFile.addStatements("\n" + POPULATE_HELPERS);
};
const overloadQueryPopulate = (sourceFile) => {
    sourceFile.addStatements("\n" + QUERY_POPULATE);
};
const createSourceFile = (genPath) => {
    const project = new Project();
    const sourceFile = project.createSourceFile(genPath, "", { overwrite: true });
    return sourceFile;
};
// TODO: statics, query, methods should all be parsed in the parser, and then written in the stringBuilder
const parseFunctions = (funcs, modelName, funcType) => {
    let interfaceString = "";
    Object.keys(funcs).forEach((key) => {
        if (["initializeTimestamps"].includes(key))
            return;
        const funcSignature = "(...args: any[]) => any";
        const type = convertFuncSignatureToType(funcSignature, funcType, modelName);
        interfaceString += convertKeyValueToLine({ key, valueType: type });
    });
    return interfaceString;
};
const getSchemaTypes = (model) => {
    const { modelName, schema } = model;
    const sanitizedModelName = sanitizeModelName(modelName);
    let schemaTypes = "";
    // add type alias to modelName so that it can be imported without clashing with the mongoose model
    schemaTypes += getObjectDocs(sanitizedModelName);
    schemaTypes += `\nexport type ${sanitizedModelName}Object = ${sanitizedModelName}\n\n`;
    schemaTypes += getQueryDocs();
    schemaTypes += `\nexport type ${sanitizedModelName}Query = mongoose.Query<any, ${sanitizedModelName}Document, ${sanitizedModelName}Queries> & ${sanitizedModelName}Queries\n\n`;
    schemaTypes += getQueryHelpersDocs(sanitizedModelName);
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
    schemaTypes += getModelDocs(sanitizedModelName);
    schemaTypes += `\nexport type ${sanitizedModelName}Model = ${modelExtend} & ${sanitizedModelName}Statics\n\n`;
    schemaTypes += getSchemaDocs(sanitizedModelName);
    schemaTypes += `\nexport type ${sanitizedModelName}Schema = mongoose.Schema<${sanitizedModelName}Document, ${sanitizedModelName}Model, ${sanitizedModelName}Methods, ${sanitizedModelName}Queries>\n\n`;
    return schemaTypes;
};
// TODO: This should be split up, shouldn't be writing to file and parsing schema simultaneously. Instead parse schema first then write later.
const generateTypes = async ({ sourceFile, imports = [], modelsPaths, noMongoose, datesAsStrings }) => {
    const models = await loadModels(modelsPaths); // Add await here
    sourceFile.addStatements((writer) => {
        writer.write(MAIN_HEADER).blankLine();
        // mongoose import
        if (!noMongoose)
            writer.write(MONGOOSE_IMPORT);
        // custom, user-defined imports
        if (imports.length > 0)
            writer.write(imports.join("\n"));
        writer.blankLine();
        models.forEach((model) => {
            const { modelName, schema } = model;
            const sanitizedModelName = sanitizeModelName(modelName);
            const leanHeader = getLeanDocs(sanitizedModelName) + `\nexport type ${sanitizedModelName} = {\n`;
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
            const documentHeader = getDocumentDocs(sanitizedModelName) +
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
const saveFile = ({ sourceFile }) => {
    try {
        sourceFile.saveSync();
    }
    catch (err) {
        console.error(err);
        throw err;
    }
};

const helpFlag = (opts = {}) => {
    return Flags.boolean({
        description: "Show CLI help.",
        ...opts,
        parse: async () => {
            // Just return true - oclif will handle the help display
            return true;
        }
    });
};

// At the top level of your file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// eslint-disable-next-line no-redeclare
class MongooseTsgen extends Command {
    static id = ".";
    static description = "Generate a Typescript file containing Mongoose Schema typings.\nSpecify the directory of your Mongoose model definitions using `MODEL_PATH`. If left blank, all sub-directories will be searched for `models/*.ts` (ignores `index.ts` files). Files found are expected to export a Mongoose model.";
    static flags = {
        config: Flags.string({
            char: "c",
            description: "[default: ./] Path of `mtgen.config.json` or its root folder. CLI flag options will take precendence over settings in `mtgen.config.json`."
        }),
        "dry-run": Flags.boolean({
            char: "d",
            description: "Print output rather than writing to file."
        }),
        help: helpFlag({
            char: "h"
        }),
        imports: Flags.string({
            char: "i",
            description: "Custom import statements to add to the output file. Useful if you use third-party types in your mongoose schema definitions. For multiple imports, specify this flag more than once.",
            multiple: true
        }),
        "no-format": Flags.boolean({
            description: "Disable formatting generated files with prettier."
        }),
        output: Flags.string({
            char: "o",
            description: "[default: ./src/interfaces] Path of output file to write generated typings. If a folder path is passed, the generator will create a `mongoose.gen.ts` file in the specified folder."
        }),
        project: Flags.string({
            char: "p",
            description: "[default: ./] Path of `tsconfig.json` or its root folder."
        }),
        debug: Flags.boolean({
            description: "Print debug information if anything isn't working"
        }),
        "no-mongoose": Flags.boolean({
            description: "Don't generate types that reference mongoose (i.e. documents). Replace ObjectId with string."
        }),
        "dates-as-strings": Flags.boolean({
            description: "Dates will be typed as strings. Useful for types returned to a frontend by API requests."
        }),
        "no-populate-overload": Flags.boolean({
            description: "Disable augmenting mongoose with Query.populate overloads (the overloads narrow the return type of populated documents queries)."
        }),
        "no-experimental-resolver": Flags.boolean({
            description: "Turn off experimentalResolver of the ts-node. It would help to resolve conflicting issue with some external modules."
        })
    };
    // path of mongoose models folder
    static args = {
        model_path: Args.string()
    };
    constructor(argv = [], config = new Config({ root: __dirname })) {
        super(argv, config);
    }
    async getConfig(customConfig) {
        const configFileFlags = getConfigFromFile(customConfig.flags.config);
        return {
            flags: {
                ...configFileFlags,
                ...customConfig.flags,
                // We dont need the config field anymore now that we've merged the config file here
                config: undefined,
                // we cant set flags as `default` using the official oclif method since the defaults would overwrite flags provided in the config file.
                // instead, well just set "output" and "project" as default manually if theyre still missing after merge with configFile.
                output: configFileFlags?.output ?? customConfig.flags.output ?? "./src/interfaces",
                project: configFileFlags?.project ?? customConfig.flags.project ?? "./"
            },
            args: {
                ...configFileFlags,
                ...customConfig.args
            }
        };
    }
    async run() {
        const customConfig = await this.parse(MongooseTsgen);
        try {
            await this.generateDefinitions(customConfig);
        }
        catch (error) {
            this.error(error, { exit: 1 });
        }
    }
    async generateDefinitions(customConfig) {
        ux.action.start("Generating mongoose typescript definitions");
        const { flags, args } = await this.getConfig(customConfig);
        if (flags.debug) {
            this.log("Debug mode enabled");
            process.env.DEBUG = "1";
        }
        const modelsPaths = getModelsPaths(args.model_path);
        const cleanupTs = await registerUserTs(flags.project);
        const generatedFilePath = cleanOutputPath(flags.output);
        let sourceFile = createSourceFile(generatedFilePath);
        const noMongoose = flags["no-mongoose"];
        const datesAsStrings = flags["dates-as-strings"];
        sourceFile = await generateTypes({
            modelsPaths,
            sourceFile,
            imports: flags.imports,
            noMongoose,
            datesAsStrings
        });
        const modelTypes = getModelTypes(modelsPaths);
        const models = loadModels(modelsPaths);
        replaceModelTypes(sourceFile, modelTypes, await models);
        // only get model types (methods, statics, queries & virtuals) if user does not specify `noMongoose`,
        if (noMongoose) {
            this.log("Skipping TS model parsing and sourceFile model type replacement");
        }
        else {
            // add populate helpers
            await addPopulateHelpers(sourceFile);
            // add mongoose.Query.populate overloads
            if (!flags["no-populate-overload"]) {
                await overloadQueryPopulate(sourceFile);
            }
        }
        cleanupTs?.();
        if (flags["dry-run"]) {
            this.log("Dry run detected, generated interfaces will be printed to console:\n");
            this.log(sourceFile.getFullText());
        }
        else {
            this.log(`Writing interfaces to ${generatedFilePath}`);
            saveFile({ sourceFile });
            if (!flags["no-format"])
                await format([generatedFilePath]);
            this.log("Writing complete 🐒");
        }
        ux.action.stop();
        return { generatedFilePath, sourceFile };
    }
}
const run = async () => {
    return await MongooseTsgen.run(process.argv.slice(2));
};

export { MongooseTsgen as default, run };
//# sourceMappingURL=index.js.map
