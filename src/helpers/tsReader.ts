import { Project, Node, SyntaxKind, MethodDeclaration, SourceFile } from "ts-morph";

function getFuncDeclarations(sourceFile: SourceFile) {
  const methodDeclarations = [];
  const staticDeclarations = [];
  const queryDeclarations = [];

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

      if (hasMethodsIdentifier) methodDeclarations.push(...rightFuncDeclarations);
      else if (hasStaticsIdentifier) staticDeclarations.push(...rightFuncDeclarations);
      else if (hasQueryIdentifier) queryDeclarations.push(...rightFuncDeclarations);
    } else if (callExpr) {
      const propAccessExpr = callExpr.getChildAtIndexIfKind(0, SyntaxKind.PropertyAccessExpression);
      if (propAccessExpr?.getName() !== "get") continue;

      const funcExpr = callExpr.getFirstChildByKind(SyntaxKind.FunctionExpression);
      const type = funcExpr?.getType()?.getText(funcExpr);
      const callExpr2 = propAccessExpr.getFirstChildByKind(SyntaxKind.CallExpression);

      // const stringLiteral = callExpr2?.getFirstChildByKind(SyntaxKind.StringLiteral)
      const stringLiteral = callExpr2?.getArguments()[0];
      const propAccessExpr2 = callExpr2?.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
      if (propAccessExpr2?.getName() !== "virtual") continue;

      const statement = propAccessExpr2?.getText();
      const virtualName = stringLiteral?.getText().replace(`"`, "");
      const returnType = type?.split("=> ")?.[1];
      console.log(`${statement} ${virtualName}: ${returnType}`);
    }
  }
  return { methodDeclarations, staticDeclarations, queryDeclarations };
}

function parseFuncDeclarations(declarations: MethodDeclaration[]) {
  const results: { [key: string]: string } = {};
  declarations.forEach(funcDeclaration => {
    const name = funcDeclaration.getName();
    const type = funcDeclaration.getType();
    results[name] = type.getText(funcDeclaration);
  });

  return results;
}

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

  const results: {
    [modelName: string]: {
      methods: { [funcName: string]: string };
      statics: { [funcName: string]: string };
      query: { [funcName: string]: string };
    };
  } = {};

  // TODO: ideally we only parse the files that we know have methods or statics, would save a lot of time
  modelsPaths.forEach(modelPath => {
    const sourceFile = project.getSourceFileOrThrow(modelPath);
    const modelName = getModelName(sourceFile);

    const { methodDeclarations, staticDeclarations, queryDeclarations } = getFuncDeclarations(
      sourceFile
    );

    const methods = methodDeclarations.length > 0 ? parseFuncDeclarations(methodDeclarations) : {};
    const statics = staticDeclarations.length > 0 ? parseFuncDeclarations(staticDeclarations) : {};
    const query = queryDeclarations.length > 0 ? parseFuncDeclarations(queryDeclarations) : {};

    results[modelName] = { methods, statics, query };
  });

  return results;
};
