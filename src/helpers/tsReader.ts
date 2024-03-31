import {
  Project,
  Node,
  SyntaxKind,
  MethodDeclaration,
  SourceFile,
  VariableDeclaration,
  ExportAssignment,
  ObjectLiteralExpression
} from "ts-morph";
import glob from "glob";
import path from "path";
import * as fs from "fs";
import stripJsonComments from "strip-json-comments";
import { ModelTypes } from "../types";

function getNameAndType(funcDeclaration: MethodDeclaration) {
  const name = funcDeclaration.getName();
  const typeNode = funcDeclaration.getType();
  const type = typeNode.getText(funcDeclaration);
  return { name, type };
}

function findCommentsInFile(
  sourceFile: SourceFile,
  modelTypes: ModelTypes,
  maxCommentDepth: number
) {
  // TODO: this is reused from findTypesInFile, should abstract out instead
  const schemaModelMapping: {
    [schemaVariableName: string]: string;
  } = {};

  Object.keys(modelTypes).forEach((modelName: string) => {
    const { schemaVariableName } = modelTypes[modelName];
    if (schemaVariableName) schemaModelMapping[schemaVariableName] = modelName;
  });

  for (const statement of sourceFile.getStatements()) {
    if (!Node.isVariableStatement(statement)) continue;
    const varDeclarationList = statement.getChildAtIndexIfKind(
      0,
      SyntaxKind.VariableDeclarationList
    );
    if (!varDeclarationList) continue;
    const varDeclaration = varDeclarationList.getFirstChildByKind(SyntaxKind.VariableDeclaration);
    if (!varDeclaration) continue;

    const schemaName = varDeclaration.getFirstChildByKind(SyntaxKind.Identifier)?.getText();
    if (!schemaName) continue;

    const modelName = schemaModelMapping[schemaName];
    if (!modelName) {
      continue;
    }

    const newExpression = varDeclaration.getFirstChildByKind(SyntaxKind.NewExpression);
    if (!newExpression) continue;
    const objLiteralExp = newExpression.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression);
    if (!objLiteralExp) continue;

    const extractComments = (objLiteralExp: ObjectLiteralExpression, rootPath: string) => {
      const propAssignments = objLiteralExp.getChildrenOfKind(SyntaxKind.PropertyAssignment);

      propAssignments.forEach(propAssignment => {
        const propName = propAssignment.getFirstChildByKind(SyntaxKind.Identifier)?.getText();
        if (!propName) return;

        const path = rootPath ? `${rootPath}.${propName}` : propName;
        propAssignment.getLeadingCommentRanges().forEach(commentRange => {
          const commentText = commentRange.getText();

          // skip comments that are not jsdocs
          if (!commentText.startsWith("/**")) return;

          modelTypes[modelName].comments.push({
            path,
            comment: commentText
          });
        });

        if (rootPath.split(".").length < maxCommentDepth) {
          const nestedObjLiteralExp = propAssignment.getFirstChildByKind(
            SyntaxKind.ObjectLiteralExpression
          );
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

function findTypesInFile(sourceFile: SourceFile, modelTypes: ModelTypes) {
  const schemaModelMapping: {
    [schemaVariableName: string]: string;
  } = {};

  Object.keys(modelTypes).forEach((modelName: string) => {
    const { schemaVariableName } = modelTypes[modelName];
    if (schemaVariableName) schemaModelMapping[schemaVariableName] = modelName;
  });

  for (const statement of sourceFile.getStatements()) {
    if (!Node.isExpressionStatement(statement)) continue;

    const binaryExpr = statement.getChildAtIndexIfKind(0, SyntaxKind.BinaryExpression);
    const callExpr = statement.getChildAtIndexIfKind(0, SyntaxKind.CallExpression);
    if (binaryExpr) {
      // left is a propertyaccessexpression, children are [identifier, dottoken, identifier]
      const left = binaryExpr.getLeft();
      const right = binaryExpr.getRight();
      if (left.getKind() !== SyntaxKind.PropertyAccessExpression) continue;
      if (
        right.getKind() !== SyntaxKind.AsExpression &&
        right.getKind() !== SyntaxKind.ObjectLiteralExpression &&
        right.getKind() !== SyntaxKind.TypeAssertionExpression
      )
        continue;

      const leftChildren = left.getChildren();

      let modelName: string;
      const hasSchemaIdentifier = leftChildren.some(child => {
        if (child.getKind() !== SyntaxKind.Identifier) return false;
        modelName = schemaModelMapping[child.getText()];
        if (!modelName) return false;

        return true;
      });

      const hasDotToken = leftChildren.some(child => child.getKind() === SyntaxKind.DotToken);
      if (!hasSchemaIdentifier || !hasDotToken) continue;

      const hasMethodsIdentifier = leftChildren.some(
        child => child.getKind() === SyntaxKind.Identifier && child.getText() === "methods"
      );
      const hasStaticsIdentifier = leftChildren.some(
        child => child.getKind() === SyntaxKind.Identifier && child.getText() === "statics"
      );
      const hasQueryIdentifier = leftChildren.some(
        child => child.getKind() === SyntaxKind.Identifier && child.getText() === "query"
      );

      let rightFuncDeclarations: any[] = [];
      if (right.getKind() === SyntaxKind.ObjectLiteralExpression) {
        rightFuncDeclarations = right.getChildrenOfKind(SyntaxKind.MethodDeclaration);
      } else if (right.getKind() === SyntaxKind.AsExpression) {
        const objLiteralExp = right.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression);
        if (objLiteralExp)
          rightFuncDeclarations = objLiteralExp.getChildrenOfKind(SyntaxKind.MethodDeclaration);
      } else if (right.getKind() === SyntaxKind.TypeAssertionExpression) {
        const objLiteralExp = right.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression);
        if (objLiteralExp) {
          rightFuncDeclarations = objLiteralExp.getChildrenOfKind(SyntaxKind.MethodDeclaration);
        }
      } else {
        rightFuncDeclarations = right.getChildrenOfKind(SyntaxKind.MethodDeclaration);
      }

      if (hasMethodsIdentifier) {
        rightFuncDeclarations.forEach((declaration: MethodDeclaration) => {
          const { name, type } = getNameAndType(declaration);
          modelTypes[modelName].methods[name] = type;
        });
      } else if (hasStaticsIdentifier) {
        rightFuncDeclarations.forEach((declaration: MethodDeclaration) => {
          const { name, type } = getNameAndType(declaration);
          modelTypes[modelName].statics[name] = type;
        });
      } else if (hasQueryIdentifier) {
        rightFuncDeclarations.forEach((declaration: MethodDeclaration) => {
          const { name, type } = getNameAndType(declaration);
          modelTypes[modelName].query[name] = type;
        });
      }
    } else if (callExpr) {
      // virtual property

      let propAccessExpr = callExpr.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);

      if (propAccessExpr?.getName() === "set") {
        propAccessExpr = propAccessExpr
          .getFirstChildByKind(SyntaxKind.CallExpression)
          ?.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
      }

      if (propAccessExpr?.getName() !== "get") continue;

      const schemaVariableName = propAccessExpr
        .getFirstChildByKind(SyntaxKind.CallExpression)
        ?.getFirstChildByKind(SyntaxKind.PropertyAccessExpression)
        ?.getFirstChildByKind(SyntaxKind.Identifier)
        ?.getText();

      if (schemaVariableName) {
        if (process.env.DEBUG)
          console.log("tsreader: Found virtual on schema: " + schemaVariableName);
      } else continue;

      const modelName = schemaModelMapping[schemaVariableName];
      if (!modelName) {
        if (process.env.DEBUG)
          console.warn(
            "tsreader: Associated model name not found for schema: " + schemaVariableName
          );
        continue;
      }

      const funcExpr = propAccessExpr
        ?.getParent()
        ?.getFirstChildByKind(SyntaxKind.FunctionExpression);
      const type = funcExpr?.getType()?.getText(funcExpr);

      const callExpr2 = propAccessExpr.getFirstChildByKind(SyntaxKind.CallExpression);

      const stringLiteral = callExpr2?.getArguments()[0];
      const propAccessExpr2 = callExpr2?.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
      if (propAccessExpr2?.getName() !== "virtual") continue;

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
      if (returnType === "void") returnType = "any";
      const virtualNameSanitized = virtualName.slice(1, virtualName.length - 1);

      modelTypes[modelName].virtuals[virtualNameSanitized] = returnType;
    }
  }

  return modelTypes;
}

const parseModelInitializer = (
  d: VariableDeclaration | ExportAssignment,
  isModelNamedImport: boolean
) => {
  const callExpr = d.getFirstChildByKind(SyntaxKind.CallExpression);
  if (!callExpr) return undefined;

  const callExprStr = callExpr.getText().replace(/[\r\n\t ]/g, "");

  // if model is a named import, we can match this without `mongoose.` prefix
  const pattern = isModelNamedImport ?
    /model(?:<\w+,\w+(?:,\w+)?>)?\(["'`](\w+)["'`],(\w+),?\)/ :
    /mongoose\.model(?:<\w+,\w+(?:,\w+)?>)?\(["'`](\w+)["'`],(\w+),?\)/;
  const modelInitMatch = callExprStr.match(pattern);
  if (!modelInitMatch) {
    if (process.env.DEBUG) {
      console.warn(
        `tsreader: Could not find model name in Mongoose model initialization: ${callExprStr}`
      );
    }
    return undefined;
  }

  const [, modelName, schemaVariableName] = modelInitMatch;
  return { modelName, schemaVariableName };
};

function initModelTypes(sourceFile: SourceFile, filePath: string) {
  if (process.env.DEBUG) console.log("tsreader: Searching file for Mongoose schemas: " + filePath);

  const modelTypes: ModelTypes = {};
  const mongooseImport = sourceFile.getImportDeclaration("mongoose");

  let isModelNamedImport = false;
  mongooseImport?.getNamedImports().forEach(importSpecifier => {
    if (importSpecifier.getText() === "model") isModelNamedImport = true;
  });

  sourceFile.getVariableDeclarations().forEach(d => {
    const { modelName, schemaVariableName } = parseModelInitializer(d, isModelNamedImport) ?? {};
    if (!modelName || !schemaVariableName) return;

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

  const defaultExportAssignment = sourceFile.getExportAssignment(d => !d.isExportEquals());
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
      console.warn(
        `tsreader: No schema found in file. If a schema exists & is exported, it will still be typed but will use generic types for methods, statics, queries & virtuals`
      );
    else console.log("tsreader: Schemas found: " + schemaNames);
  }

  return modelTypes;
}

export const getModelTypes = (modelsPaths: string[], maxCommentDepth = 2): ModelTypes => {
  const project = new Project({});
  project.addSourceFilesAtPaths(modelsPaths);

  let allModelTypes: ModelTypes = {};

  // TODO: ideally we only parse the files that we know have methods, statics, or virtuals.
  // Would save a lot of time
  modelsPaths.forEach(modelPath => {
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

export const registerUserTs = (basePath: string): (() => void) | null => {
  const pathToSearch = basePath.endsWith(".json") ?
    basePath :
    path.join(basePath, "**/tsconfig.json");
  const files = glob.sync(pathToSearch, { ignore: "**/node_modules/**" });

  if (files.length === 0) throw new Error(`No tsconfig.json file found at path "${basePath}"`);
  else if (files.length > 1)
    throw new Error(
      `Multiple tsconfig.json files found. Please specify a more specific --project value.\nPaths found: ${files}`
    );

  const foundPath = path.join(process.cwd(), files[0]);
  if (process.env.DEBUG) {
    console.log("tsreader: Registering tsconfig.json with ts-node at path: " + foundPath);
  }
  require("ts-node").register({
    transpileOnly: true,
    project: foundPath,
    compilerOptions: {
      module: "commonjs"
    }
  });

  // handle path aliases
  const tsConfigString = fs.readFileSync(foundPath, "utf8");

  try {
    const tsConfig = JSON.parse(stripJsonComments(tsConfigString));
    if (tsConfig?.compilerOptions?.paths) {
      const baseUrl = process.cwd();
      if (process.env.DEBUG) {
        console.log(
          "tsreader: Found paths field in tsconfig.json, registering project with tsconfig-paths using baseUrl " +
            baseUrl
        );
      }

      const cleanup = require("tsconfig-paths").register({
        baseUrl,
        paths: tsConfig.compilerOptions.paths
      });

      return cleanup;
    }

    return null;
  } catch (err) {
    throw new Error(`Error parsing your tsconfig.json file: ${(err as Error).message}`);
  }
};
