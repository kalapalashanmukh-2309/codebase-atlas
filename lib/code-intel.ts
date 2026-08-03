/**
 * lib/code-intel.ts
 *
 * Function-level code intelligence module for TypeScript and JavaScript files.
 * Uses TypeScript compiler AST parsing to extract function declarations,
 * arrow functions, methods, line ranges, export flags, and call expressions.
 */

import ts from "typescript";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FunctionInfo = {
  name: string;
  lineStart: number;
  lineEnd?: number;
  isExport: boolean;
};

export type CallInfo = {
  callerFunction?: string; // name of function containing this call, if known
  calleeName: string; // name of the function being called
  line: number;
};

export type FileIntelligence = {
  path: string;
  functions: FunctionInfo[];
  calls: CallInfo[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScriptKind(filePath: string): ts.ScriptKind {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (lower.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (lower.endsWith(".ts") || lower.endsWith(".mts") || lower.endsWith(".cts")) {
    return ts.ScriptKind.TS;
  }
  return ts.ScriptKind.JS;
}

function hasExportModifier(node: ts.Node): boolean {
  if (ts.canHaveModifiers(node)) {
    const modifiers = ts.getModifiers(node);
    if (modifiers) {
      return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    }
  }
  return false;
}

function extractCalleeName(expression: ts.Expression, sourceFile: ts.SourceFile): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  if (ts.isElementAccessExpression(expression)) {
    const argument = expression.argumentExpression;
    if (argument && ts.isStringLiteral(argument)) {
      return argument.text;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main Analysis API
// ---------------------------------------------------------------------------

/**
 * Analyzes a TS/JS file and extracts function definitions and call sites using TypeScript AST.
 */
export function analyzeFile(file: { path: string; content: string }): FileIntelligence {
  const result: FileIntelligence = {
    path: file.path,
    functions: [],
    calls: [],
  };

  if (!file.content || !file.content.trim()) {
    return result;
  }

  try {
    const scriptKind = getScriptKind(file.path);
    const sourceFile = ts.createSourceFile(
      file.path,
      file.content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    const functionStack: string[] = [];

    function visit(node: ts.Node) {
      let isFunctionNode = false;
      let functionName: string | null = null;
      let isExport = false;

      // 1. Function Declaration
      if (ts.isFunctionDeclaration(node)) {
        isFunctionNode = true;
        functionName = node.name ? node.name.text : "anonymous";
        isExport = hasExportModifier(node) || (node.parent && hasExportModifier(node.parent));
      }
      // 2. Arrow function or function expression assigned to a variable
      else if (ts.isVariableDeclaration(node) && node.initializer) {
        const init = node.initializer;
        if (
          (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) &&
          ts.isIdentifier(node.name)
        ) {
          isFunctionNode = true;
          functionName = node.name.text;
          const varStatement = node.parent?.parent;
          isExport = varStatement ? hasExportModifier(varStatement) : false;
        }
      }
      // 3. Method Declaration in Class or Object Literal
      else if (ts.isMethodDeclaration(node)) {
        isFunctionNode = true;
        if (ts.isIdentifier(node.name) || ts.isPrivateIdentifier(node.name)) {
          functionName = node.name.text;
        } else {
          functionName = node.name.getText(sourceFile);
        }
        const classDecl = node.parent;
        isExport = classDecl ? hasExportModifier(classDecl) : false;
      }

      // Record function definition if found
      if (isFunctionNode && functionName) {
        const lineStart = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        const lineEnd = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;

        result.functions.push({
          name: functionName,
          lineStart,
          lineEnd,
          isExport,
        });

        functionStack.push(functionName);
      }

      // 4. Call Expression detection
      if (ts.isCallExpression(node)) {
        const calleeName = extractCalleeName(node.expression, sourceFile);
        if (calleeName) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          const callerFunction = functionStack.length > 0 ? functionStack[functionStack.length - 1] : undefined;

          result.calls.push({
            callerFunction,
            calleeName,
            line,
          });
        }
      }

      // Recurse children
      ts.forEachChild(node, visit);

      // Pop function stack when leaving function node
      if (isFunctionNode && functionName) {
        functionStack.pop();
      }
    }

    visit(sourceFile);
  } catch (err) {
    console.warn(`[code-intel] Error analyzing file ${file.path}:`, err);
  }

  return result;
}
