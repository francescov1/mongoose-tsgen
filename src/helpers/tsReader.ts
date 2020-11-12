import { Project, Node, SyntaxKind, MethodDeclaration, SourceFile } from "ts-morph";

function getFuncDeclarations(sourceFile: SourceFile) {
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
    const results: { [key: string]: string } = {};
    declarations.forEach(funcDeclaration => {
        const name = funcDeclaration.getName();
        const type = funcDeclaration.getType();
        results[name] = type.getText(funcDeclaration);
    })
    
    return results;
}

function getModelName(sourceFile: SourceFile) {
    const defaultExportAssignment = sourceFile.getExportAssignment(d => !d.isExportEquals())
    if (!defaultExportAssignment) {
        // TODO: if no default, check all exports and compare to filename until a match is found
        throw new Error("No default export found in file: " + sourceFile.getFilePath() + ". Ensure to default export a Mongoose model from this file or disable method/static/query typings (--no-func-types | -n).")
    }

    return defaultExportAssignment.getExpression().getText();
}

// TODO: need to get any custom imports from user for generated file - ideally a config file can be used at this point since we have enough options

export const getFunctionTypes = (modelsPaths: string[]) => {
    const project = new Project({});
    project.addSourceFilesAtPaths(modelsPaths);

    // TODO: replace `this: any` with `this: I{modelName}`

    const results: { 
        [modelName: string]: { 
            methods: { [funcName: string]: string }, 
            statics: { [funcName: string]: string }, 
        }
    } = {};

    // TODO: ideally we only parse the files that we know have methods or statics, would save a lot of time
    modelsPaths.forEach(modelPath => {
        const sourceFile = project.getSourceFileOrThrow(modelPath);
        const modelName = getModelName(sourceFile);

        const { methodDeclarations, staticDeclarations } = getFuncDeclarations(sourceFile);
        
        const methods = methodDeclarations.length > 0 ? parseFuncDeclarations(methodDeclarations) : {};
        const statics = staticDeclarations.length > 0 ? parseFuncDeclarations(staticDeclarations) : {};
        
        results[modelName] = { methods, statics };
    })

    return results;
}
