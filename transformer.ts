import * as ts from 'typescript';
const orUndefinedName = 'orUndefined';
export default function(program: ts.Program, pluginOptions: {}) {
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            const vars: ts.Identifier[] = [];
            const undefinedIdent = ts.createOptimisticUniqueName('u');

            function visitor(node: ts.Node): ts.Node {
                if (
                    ts.isCallExpression(node) &&
                    ts.isPropertyAccessExpression(node.expression) &&
                    ts.isIdentifier(node.expression.name) &&
                    node.expression.name.text === orUndefinedName &&
                    node.arguments.length === 0
                ) {
                    const expr = node.expression.expression;
                    if (ts.isPropertyAccessExpression(expr) || ts.isNonNullExpression(expr)) {
                        return addSourceCommment(expr, convertExpression(expr));
                    } else {
                        return expr;
                    }
                }
                return ts.visitEachChild(node, visitor, ctx);
            }
            return addVarsToSourceFile(ts.visitEachChild(sourceFile, visitor, ctx), vars);

            function addVarsToSourceFile(sourceFile: ts.SourceFile, vars: ts.Identifier[]) {
                if (vars.length === 0) return sourceFile;
                vars.push(undefinedIdent);
                return ts.updateSourceFileNode(sourceFile, [
                    ...sourceFile.statements,
                    ts.createVariableStatement(
                        [],
                        ts.createVariableDeclarationList(vars.map(ident => ts.createVariableDeclaration(ident))),
                    ),
                ]);
            }

            function createIdentifier(node: ts.Node) {
                const ident = ts.getGeneratedNameForNode(node);
                if (vars.indexOf(ident) === -1) vars.push(ident);
                return ident;
            }

            function convertExpression(expr: ts.Expression): ts.Expression {
                if (ts.isNonNullExpression(expr)) {
                    return convertExpression(expr.expression);
                }
                if (ts.isIdentifier(expr)) {
                    return ts.createIdentifier(expr.text);
                }
                if (ts.isPropertyAccessExpression(expr)) {
                    return createConditional(expr.expression, ident => ts.createPropertyAccess(ident, expr.name));
                }
                if (ts.isElementAccessExpression(expr)) {
                    return createConditional(expr.expression, ident =>
                        ts.createElementAccess(ident, expr.argumentExpression),
                    );
                }
                if (ts.isCallExpression(expr)) {
                    return createConditional(expr.expression, ident =>
                        ts.createCall(ident, expr.typeArguments, expr.arguments),
                    );
                }
                return expr;
            }

            function createConditional(left: ts.Expression, right: (ident: ts.Identifier) => ts.Expression) {
                const leftExpr = convertExpression(left);
                let ident: ts.Identifier | undefined;
                return ts.createConditional(
                    ts.createBinary(
                        ts.isIdentifier(leftExpr)
                            ? leftExpr
                            : ts.createBinary((ident = createIdentifier(left)), ts.SyntaxKind.EqualsToken, leftExpr),
                        ts.SyntaxKind.EqualsEqualsEqualsToken,
                        undefinedIdent,
                    ),
                    ts.createToken(ts.SyntaxKind.QuestionToken),
                    undefinedIdent,
                    ts.createToken(ts.SyntaxKind.ColonToken),
                    right(ts.isIdentifier(leftExpr) ? leftExpr : nonNull(ident)),
                );
            }
        };
    };
}

function nonNull<T>(n: T | undefined) {
    if (n === undefined) throw new Error('Something went wrong');
    return n!;
}

// function copyPos<T extends ts.Node>(newNode: T, node: T): T {
//     newNode.pos = node.pos;
//     newNode.end = node.end;
//     return node;
// }

// function deepCopy<T extends ts.Node>(node: T): T {
//     if (ts.isPropertyAccessExpression(node)) {
//         return copyPos(ts.createPropertyAccess(deepCopy(node.expression), deepCopy(node.name)), node) as any;
//     }
//     if (ts.isNonNullExpression(node)) {
//         return copyPos(deepCopy(node.expression), node.expression) as any;
//     }
//     if (ts.isIdentifier(node)) {
//         return copyPos(ts.createIdentifier(node.text), node) as any;
//     }
//     throw new Error('Unexpected expression type: ' + ts.SyntaxKind[node.kind]);
// }

function addSourceCommment<T extends ts.Node>(original: ts.Node, node: T): T {
    ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, original.getText());
    return node;
}

// var AB,ABC
// a()!.b!.c
// ((AB=((A=a()) === u ? u : A.b)) === u ? u : AB.c)
// (T = a.b, T === u ? : u : T)
