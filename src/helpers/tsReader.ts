import { Project, Node, SyntaxKind, MethodDeclaration, SourceFile } from "ts-morph";

function getNameAndType(funcDeclaration: MethodDeclaration) {
  const name = funcDeclaration.getName();
  const typeNode = funcDeclaration.getType();
  const type = typeNode.getText(funcDeclaration);
  return { name, type };
}

function getFuncDeclarations(sourceFile: SourceFile) {
  const results: Results["modelName"] = { methods: {}, statics: {}, query: {}, virtuals: {} };
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
        right.getKind() !== SyntaxKind.ObjectLiteralExpression &&
        right.getKind() !== SyntaxKind.AsExpression
      )
        continue;

      const leftChildren = left.getChildren();

      const hasSchemaIdentifier = leftChildren.some(
        child =>
          child.getKind() === SyntaxKind.Identifier && child.getText().match(/[a-zA-Z]+Schema/i)
      );
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
      } else {
        rightFuncDeclarations = right.getChildrenOfKind(SyntaxKind.MethodDeclaration);
      }

      if (hasMethodsIdentifier) {
        rightFuncDeclarations.forEach((declaration: MethodDeclaration) => {
          const { name, type } = getNameAndType(declaration);
          results.methods[name] = type;
        });
      } else if (hasStaticsIdentifier) {
        rightFuncDeclarations.forEach((declaration: MethodDeclaration) => {
          const { name, type } = getNameAndType(declaration);
          results.statics[name] = type;
        });
      } else if (hasQueryIdentifier) {
        rightFuncDeclarations.forEach((declaration: MethodDeclaration) => {
          const { name, type } = getNameAndType(declaration);
          results.query[name] = type;
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

      const funcExpr = callExpr.getFirstChildByKind(SyntaxKind.FunctionExpression);

      // const typeRef = funcExpr?.getFirstChildByKind(SyntaxKind.TypeReference);
      // console.log("return type: ", typeRef?.getFirstChildByKind(SyntaxKind.Identifier)?.getText());

      const type = funcExpr?.getType()?.getText(funcExpr);

      // console.log(funcExpr?.getReturnType().getText(funcExpr))
      const callExpr2 = propAccessExpr.getFirstChildByKind(SyntaxKind.CallExpression);

      const stringLiteral = callExpr2?.getArguments()[0];
      const propAccessExpr2 = callExpr2?.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
      if (propAccessExpr2?.getName() !== "virtual") continue;

      const virtualName = stringLiteral?.getText();
      let returnType = type?.split("=> ")?.[1];
      if (!returnType || !virtualName) continue;

      /**
       * @experimental trying this out since certain virtual types are indeterminable and get set to void, which creates incorrect TS errors
       */
      if (returnType === "void") returnType = "any";
      const virtualNameSanitized = virtualName.slice(1, virtualName.length - 1);

      results.virtuals[virtualNameSanitized] = returnType;
    }
  }

  return results;
}

type Results = {
  [modelName: string]: {
    methods: { [funcName: string]: string };
    statics: { [funcName: string]: string };
    query: { [funcName: string]: string };
    virtuals: { [virtualName: string]: string };
  };
};

function getModelName(sourceFile: SourceFile) {
  const defaultExportAssignment = sourceFile.getExportAssignment(d => !d.isExportEquals());
  if (!defaultExportAssignment) {
    // TODO: if no default, check all exports and compare to filename until a match is found
    throw new Error(
      "No default export found in file: " +
        sourceFile.getFilePath() +
        ". Ensure to default export a Mongoose model from this file or disable method/static/query typings (--no-func-types)."
    );
  }

  return defaultExportAssignment.getExpression().getText();
}

export const getFunctionTypes = (modelsPaths: string[]) => {
  const project = new Project({});
  project.addSourceFilesAtPaths(modelsPaths);

  const results: Results = {};

  // TODO: ideally we only parse the files that we know have methods or statics, would save a lot of time
  modelsPaths.forEach(modelPath => {
    const sourceFile = project.getSourceFileOrThrow(modelPath);
    const modelName = getModelName(sourceFile);

    const { methods, statics, query, virtuals } = getFuncDeclarations(sourceFile);
    results[modelName] = { methods, statics, query, virtuals };
  });

  return results;
};
