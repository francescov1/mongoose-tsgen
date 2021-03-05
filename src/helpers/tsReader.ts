import {
  Project,
  Node,
  SyntaxKind,
  MethodDeclaration,
  SourceFile,
  VariableDeclaration,
  ExportAssignment
} from "ts-morph";

function getNameAndType(funcDeclaration: MethodDeclaration) {
  const name = funcDeclaration.getName();
  const typeNode = funcDeclaration.getType();
  const type = typeNode.getText(funcDeclaration);
  return { name, type };
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
      if (right.getKind() === SyntaxKind.AsExpression) {
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
      if (!schemaVariableName) continue;

      const modelName = schemaModelMapping[schemaVariableName];
      if (!modelName) continue;

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
      if (!returnType || !virtualName) continue;

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

type ModelTypes = {
  [modelName: string]: {
    methods: { [funcName: string]: string };
    statics: { [funcName: string]: string };
    query: { [funcName: string]: string };
    virtuals: { [virtualName: string]: string };
    schemaVariableName?: string;
    modelVariableName?: string;
    filePath: string;
  };
};

const parseModelInitializer = (
  d: VariableDeclaration | ExportAssignment,
  isModelNamedImport: boolean
) => {
  const callExpr = d.getFirstChildByKind(SyntaxKind.CallExpression);
  if (!callExpr) return undefined;

  const callExprStr = callExpr.getText().replace(/[\r\n\t ]/g, "");

  // if model is a named import, we can match this without `mongoose.` prefix
  const pattern = isModelNamedImport ?
    /model(?:<\w+,\w+>)?\(["'`](\w+)["'`],(\w+)\)/ :
    /mongoose\.model(?:<\w+,\w+>)?\(["'`](\w+)["'`],(\w+)\)/;
  const modelInitMatch = callExprStr.match(pattern);
  if (!modelInitMatch) return undefined;

  const [, modelName, schemaVariableName] = modelInitMatch;
  return { modelName, schemaVariableName };
};

function initModelTypes(sourceFile: SourceFile, filePath: string) {
  const modelTypes: ModelTypes = {};
  const mongooseImport = sourceFile.getImportDeclaration("mongoose");

  let isModelNamedImport = false;
  mongooseImport?.getNamedImports().forEach(importSpecifier => {
    if (importSpecifier.getText() === "model") isModelNamedImport = true;
  });

  sourceFile.getVariableDeclarations().forEach(d => {
    if (!d.hasExportKeyword()) return;

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
      virtuals: {}
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
        virtuals: {}
      };
    }
  }

  return modelTypes;
}

export const getModelTypes = (modelsPaths: string[]): ModelTypes => {
  const project = new Project({});
  project.addSourceFilesAtPaths(modelsPaths);

  let allModelTypes: ModelTypes = {};

  // TODO: ideally we only parse the files that we know have methods, statics, or virtuals.
  // Would save a lot of time
  modelsPaths.forEach(modelPath => {
    const sourceFile = project.getSourceFileOrThrow(modelPath);
    let modelTypes = initModelTypes(sourceFile, modelPath);

    modelTypes = findTypesInFile(sourceFile, modelTypes);
    allModelTypes = {
      ...allModelTypes,
      ...modelTypes
    };
  });

  return allModelTypes;
};
