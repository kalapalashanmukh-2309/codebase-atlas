/**
 * lib/ast-intel.ts
 *
 * Repository-wide function intelligence module. Uses TypeScript compiler AST
 * to map function names to exact definition locations, line ranges, export flags,
 * call sites, caller functions, and total invocation counts.
 */

import ts from "typescript";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FunctionDefinition = {
  file: string;
  name: string;
  lineStart: number;
  lineEnd?: number;
  isExport: boolean;
};

export type FunctionCallSite = {
  file: string;
  line: number;
  callerFunction?: string; // if inside a known function
};

export type FunctionDetail = {
  name: string;
  definitions: FunctionDefinition[];
  callSites: FunctionCallSite[];
  callCount: number;
};

export type FunctionIndexRecord = Record<
  string,
  {
    name: string;
    definitions: {
      file: string;
      lineStart: number;
      lineEnd?: number;
      isExport: boolean;
    }[];
    callSites: { file: string; line: number; callerFunction?: string }[];
    callCount: number;
  }
>;

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

function extractCalleeName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.name)) {
    return expression.name.text;
  }
  if (ts.isElementAccessExpression(expression) && expression.argumentExpression) {
    if (ts.isStringLiteral(expression.argumentExpression)) {
      return expression.argumentExpression.text;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a repository-wide function index mapping each function name to its
 * definitions (file + line range + export status), call sites, and total call counts.
 */
export function buildFunctionIndex(
  files: { path: string; content: string }[]
): Map<string, FunctionDetail> {
  const indexMap = new Map<string, FunctionDetail>();

  function getOrCreateDetail(name: string): FunctionDetail {
    let detail = indexMap.get(name);
    if (!detail) {
      detail = {
        name,
        definitions: [],
        callSites: [],
        callCount: 0,
      };
      indexMap.set(name, detail);
    }
    return detail;
  }

  for (const file of files) {
    if (!file.content || !file.path) continue;

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
        let isFunctionScope = false;
        let funcName: string | null = null;
        let isExport = false;

        // 1. Function Declaration
        if (ts.isFunctionDeclaration(node)) {
          isFunctionScope = true;
          funcName = node.name ? node.name.text : null;
          isExport =
            hasExportModifier(node) ||
            Boolean(node.parent && hasExportModifier(node.parent));
        }
        // 2. Arrow Function or Function Expression assigned to Variable
        else if (ts.isVariableDeclaration(node) && node.initializer) {
          const init = node.initializer;
          if (
            (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) &&
            ts.isIdentifier(node.name)
          ) {
            isFunctionScope = true;
            funcName = node.name.text;
            const parentStatement = node.parent?.parent;
            isExport =
              hasExportModifier(node) ||
              Boolean(parentStatement && hasExportModifier(parentStatement));
          }
        }
        // 3. Method Declaration inside Class or Object
        else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
          isFunctionScope = true;
          funcName = node.name.text;
          isExport = hasExportModifier(node);
        }

        // Record definition if a named function scope was detected
        if (isFunctionScope && funcName) {
          const lineStart =
            sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          const lineEnd =
            sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;

          const detail = getOrCreateDetail(funcName);
          detail.definitions.push({
            file: file.path,
            name: funcName,
            lineStart,
            lineEnd,
            isExport,
          });
        }

        // Detect CallExpressions
        if (ts.isCallExpression(node)) {
          const callee = extractCalleeName(node.expression);
          if (callee) {
            const line =
              sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
            const callerFunction =
              functionStack.length > 0 ? functionStack[functionStack.length - 1] : undefined;

            const detail = getOrCreateDetail(callee);
            detail.callCount += 1;
            detail.callSites.push({
              file: file.path,
              line,
              callerFunction,
            });
          }
        }

        // Scope stack management for nested AST traversal
        if (isFunctionScope && funcName) {
          functionStack.push(funcName);
          ts.forEachChild(node, visit);
          functionStack.pop();
        } else {
          ts.forEachChild(node, visit);
        }
      }

      visit(sourceFile);
    } catch {
      // Skips unparseable files cleanly
    }
  }

  return indexMap;
}

/**
 * Builds a JSON-serializable Record of function details keyed by function name.
 */
export function buildFunctionIndexRecord(
  files: { path: string; content: string }[]
): FunctionIndexRecord {
  const map = buildFunctionIndex(files);
  const record: FunctionIndexRecord = {};

  for (const [key, val] of map.entries()) {
    record[key] = {
      name: val.name,
      definitions: val.definitions.map((d) => ({
        file: d.file,
        lineStart: d.lineStart,
        lineEnd: d.lineEnd,
        isExport: d.isExport,
      })),
      callSites: val.callSites,
      callCount: val.callCount,
    };
  }

  return record;
}
