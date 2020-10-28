import { Project, Node, SyntaxKind, MethodDeclaration, SourceFile } from "ts-morph";

function getFuncDeclarations(sourceFile: SourceFile) {
  // const filename = path.basename(controllerPath, ".ts");
  // console.log(SyntaxKind.ExpressionStatement);

  // for (const variable of sourceFile.getVariableDeclarations()) {
  //   const varName = variable.getName();
    
  //   // console.log(variable.getInitializer().getText())

  //   // TODO: may wanna refine this
  //   if (varName.match(/[a-zA-Z]+Schema/i)) {
  //     const identifier = variable.getNameNode()
  //     if (Node.isIdentifier(identifier)) {
        
  //       // console.log(varName)
  //       // console.log(variable.getText())
  //       // console.log("\n========================================\n")
  //       // const refs = identifier.findReferences()[0].getReferences();
  //       // refs.forEach(ref => {
  //       //   console.log(ref.getNode().getKindName())
  //       //   console.log("\n========================================\n")
  //       // })
  //     }
  //   }

  const methodDeclarations = [];
  const staticDeclarations = []

  for (const statement of sourceFile.getStatements()) {
    if (!Node.isExpressionStatement(statement)) continue;

    const binaryExpr = statement.getChildAtIndexIfKind(0, SyntaxKind.BinaryExpression)
    if (!binaryExpr) continue;
    
    // left is a propertyaccessexpression, children are [identifier, dottoken, identifier]
    const left = binaryExpr.getLeft()
    const right = binaryExpr.getRight()
    if (left.getKind() !== SyntaxKind.PropertyAccessExpression) continue;
    if (right.getKind() !== SyntaxKind.ObjectLiteralExpression) continue;

    const leftChildren = left.getChildren()
    
    const hasSchemaIdentifier = leftChildren.some(child => child.getKind() === SyntaxKind.Identifier && child.getText().match(/[a-zA-Z]+Schema/i))
    const hasDotToken = leftChildren.some(child => child.getKind() === SyntaxKind.DotToken)
    
    if (!hasSchemaIdentifier || !hasDotToken) continue;

    const hasMethodsIdentifier = leftChildren.some(child => child.getKind() === SyntaxKind.Identifier && child.getText() === "methods")
    const hasStaticsIdentifier = leftChildren.some(child => child.getKind() === SyntaxKind.Identifier && child.getText() === "statics")
    
    const rightFuncDeclarations = right.getChildrenOfKind(SyntaxKind.MethodDeclaration)
    if (hasMethodsIdentifier) methodDeclarations.push(...rightFuncDeclarations);
    else if (hasStaticsIdentifier) staticDeclarations.push(...rightFuncDeclarations)
  }

  return { methodDeclarations, staticDeclarations }
}

function parseFuncDeclarations(declarations: MethodDeclaration[]) {
  return declarations.map(funcDeclaration => {
    const funcName = funcDeclaration.getName();
    const type = funcDeclaration.getType();
    return { funcName, type: type.getText(funcDeclaration) }
  })
}

export const getFunctionTypes = (modelsPath: string | string[]) => {
    const project = new Project({});

    // project.addSourceFilesAtPaths(["./src/models/**/*.ts"]);
    // TODO: if this is not an array, need to remove 'index.ts' and add /**/*.ts 
    project.addSourceFilesAtPaths(modelsPath);
    
    try {
        // "./src/models/organization.ts"
      const sourceFile = project.getSourceFileOrThrow(modelsPath[0]);
      const { methodDeclarations } = getFuncDeclarations(sourceFile);
      console.log(parseFuncDeclarations(methodDeclarations))
      // console.log(parseFuncDeclarations(staticDeclarations))
    } catch (err) {
      console.error(err);
    }
}
