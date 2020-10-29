import glob from 'glob';
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
    const name = funcDeclaration.getName();
    const type = funcDeclaration.getType();
    return { name, type: type.getText(funcDeclaration) }
  })
}

function getModelName(sourceFile: SourceFile) {
    const defaultExportAssignment = sourceFile.getExportAssignment(d => !d.isExportEquals())
    if (!defaultExportAssignment) {
        // TODO: if no default, check all exports and compare to filename until a match is found
        throw new Error("Error determining method and static types of No default export found in file: " + sourceFile.getFilePath() + ". Either disable method and static function typing or ensure to default export your Mongoose model.")
    }

    return defaultExportAssignment.getExpression().getText();
}

export const getFunctionTypes = () => {
    const modelsPaths = glob.sync('./src/models/**/!(index).ts');

    const project = new Project({});
    project.addSourceFilesAtPaths(modelsPaths);
    
    // TODO: set this up to handle paths found from parser
    
    // if (Array.isArray(modelsPath)) {
    //     project.addSourceFilesAtPaths(modelsPath);
    // }
    // else {
    //     project.addSourceFilesAtPaths(modelsPath.replace(`index`, "**/*"));
    //     // modelsPath = [modelsPath]
    //     // TODO: gonna need to redo this with each model paths
    // }
    const results: { 
        [key: string]: { 
            methodTypes: { name: string, type: string }[], 
            staticTypes: { name: string, type: string }[] 
        }
    } = {};

    // TODO: ideally we only parse the files that we know have methods or statics, would save a lot of time
    modelsPaths.forEach(modelPath => {
        const sourceFile = project.getSourceFileOrThrow(modelPath);
        const modelName = getModelName(sourceFile);

        const { methodDeclarations, staticDeclarations } = getFuncDeclarations(sourceFile);
        
        const methodTypes = methodDeclarations.length > 0 ? parseFuncDeclarations(methodDeclarations) : [];
        const staticTypes = staticDeclarations.length > 0 ? parseFuncDeclarations(staticDeclarations) : [];
        
        results[modelName] = { methodTypes, staticTypes };
    })

    return results;
}
