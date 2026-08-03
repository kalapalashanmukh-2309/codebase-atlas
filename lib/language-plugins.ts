/**
 * lib/language-plugins.ts
 *
 * Language plugin abstraction and registry for Codebase Atlas.
 * Provides extensible interfaces for file filtering, import extraction,
 * function definition extraction, call graph extraction, and repository language detection.
 */

import ts from "typescript";

// ---------------------------------------------------------------------------
// Plugin Abstraction Types
// ---------------------------------------------------------------------------

export type FunctionInfo = {
  name: string;
  lineStart: number;
  lineEnd?: number;
  isExport?: boolean;
};

export type CallInfo = {
  callerFunction?: string;
  calleeName: string;
  line: number;
};

export type LanguagePlugin = {
  name: string; // e.g. "typescript", "python", "go"
  fileFilter: (path: string) => boolean;
  extractImports?: (file: { path: string; content: string }) => string[];
  extractFunctions?: (file: { path: string; content: string }) => FunctionInfo[];
  extractCalls?: (file: { path: string; content: string }) => CallInfo[];
};

export type RepoLanguageHint = {
  language: string;
  confidence: "high" | "medium" | "low";
  reason: string;
};

// ---------------------------------------------------------------------------
// TypeScript / JavaScript Language Plugin
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

export const typescriptPlugin: LanguagePlugin = {
  name: "typescript",
  fileFilter: (path: string) => {
    const lower = path.toLowerCase();
    return (
      (lower.endsWith(".ts") ||
        lower.endsWith(".tsx") ||
        lower.endsWith(".js") ||
        lower.endsWith(".jsx") ||
        lower.endsWith(".mjs") ||
        lower.endsWith(".cjs")) &&
      !lower.endsWith(".d.ts")
    );
  },

  extractImports: (file: { path: string; content: string }): string[] => {
    try {
      const sourceFile = ts.createSourceFile(
        file.path,
        file.content,
        ts.ScriptTarget.Latest,
        true,
        getScriptKind(file.path)
      );

      const imports: string[] = [];

      function visit(node: ts.Node) {
        if (ts.isImportDeclaration(node)) {
          if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            imports.push(node.moduleSpecifier.text);
          }
        } else if (ts.isExportDeclaration(node)) {
          if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            imports.push(node.moduleSpecifier.text);
          }
        } else if (ts.isCallExpression(node)) {
          if (
            (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
              (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
            node.arguments.length > 0 &&
            ts.isStringLiteral(node.arguments[0])
          ) {
            imports.push(node.arguments[0].text);
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      return Array.from(new Set(imports));
    } catch {
      return [];
    }
  },

  extractFunctions: (file: { path: string; content: string }): FunctionInfo[] => {
    try {
      const sourceFile = ts.createSourceFile(
        file.path,
        file.content,
        ts.ScriptTarget.Latest,
        true,
        getScriptKind(file.path)
      );

      const functions: FunctionInfo[] = [];

      function visit(node: ts.Node) {
        const isExport = hasExportModifier(node);

        if (ts.isFunctionDeclaration(node) && node.name) {
          const { line: lineStart } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const { line: lineEnd } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
          functions.push({
            name: node.name.text,
            lineStart: lineStart + 1,
            lineEnd: lineEnd + 1,
            isExport,
          });
        } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
          const { line: lineStart } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const { line: lineEnd } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
          functions.push({
            name: node.name.text,
            lineStart: lineStart + 1,
            lineEnd: lineEnd + 1,
            isExport,
          });
        } else if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (
              ts.isIdentifier(decl.name) &&
              decl.initializer &&
              (ts.isArrowFunction(decl.initializer) ||
                ts.isFunctionExpression(decl.initializer))
            ) {
              const { line: lineStart } = sourceFile.getLineAndCharacterOfPosition(decl.getStart());
              const { line: lineEnd } = sourceFile.getLineAndCharacterOfPosition(decl.getEnd());
              functions.push({
                name: decl.name.text,
                lineStart: lineStart + 1,
                lineEnd: lineEnd + 1,
                isExport,
              });
            }
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      return functions;
    } catch {
      return [];
    }
  },

  extractCalls: (file: { path: string; content: string }): CallInfo[] => {
    try {
      const sourceFile = ts.createSourceFile(
        file.path,
        file.content,
        ts.ScriptTarget.Latest,
        true,
        getScriptKind(file.path)
      );

      const calls: CallInfo[] = [];

      function visit(node: ts.Node, currentFunction?: string) {
        let activeFunction = currentFunction;

        if (ts.isFunctionDeclaration(node) && node.name) {
          activeFunction = node.name.text;
        } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
          activeFunction = node.name.text;
        } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
          if (
            node.initializer &&
            (ts.isArrowFunction(node.initializer) ||
              ts.isFunctionExpression(node.initializer))
          ) {
            activeFunction = node.name.text;
          }
        }

        if (ts.isCallExpression(node)) {
          const calleeName = extractCalleeName(node.expression);
          if (calleeName) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            calls.push({
              callerFunction: activeFunction,
              calleeName,
              line: line + 1,
            });
          }
        }

        ts.forEachChild(node, (child) => visit(child, activeFunction));
      }

      visit(sourceFile);
      return calls;
    } catch {
      return [];
    }
  },
};

// ---------------------------------------------------------------------------
// Language Plugin Registry
// ---------------------------------------------------------------------------

export const languagePlugins: LanguagePlugin[] = [typescriptPlugin];

export function findLanguagePlugin(path: string): LanguagePlugin | null {
  for (const plugin of languagePlugins) {
    if (plugin.fileFilter(path)) {
      return plugin;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Language Detection Heuristics
// ---------------------------------------------------------------------------

export function detectRepoLanguages(files: string[]): RepoLanguageHint[] {
  const hints: RepoLanguageHint[] = [];

  const lowerFiles = files.map((f) => f.toLowerCase());
  const basenames = lowerFiles.map((f) => f.split("/").pop() || "");

  // TypeScript / JavaScript
  const hasTsConfig = basenames.includes("tsconfig.json");
  const hasPackageJson = basenames.includes("package.json");
  const tsJsFileCount = lowerFiles.filter((f) =>
    /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)
  ).length;

  if (hasTsConfig || hasPackageJson || tsJsFileCount > 0) {
    let confidence: "high" | "medium" | "low" = "low";
    let reason = `Found ${tsJsFileCount} TS/JS files.`;

    if (hasPackageJson && tsJsFileCount > 0) {
      confidence = "high";
      reason = `Found package.json and ${tsJsFileCount} TypeScript/JavaScript files.`;
    } else if (hasTsConfig || tsJsFileCount > 3) {
      confidence = "high";
      reason = `Found tsconfig.json and ${tsJsFileCount} TypeScript files.`;
    } else if (tsJsFileCount > 0) {
      confidence = "medium";
    }

    hints.push({
      language: "TypeScript/JavaScript",
      confidence,
      reason,
    });
  }

  // Python
  const hasPyProject = basenames.includes("pyproject.toml") || basenames.includes("requirements.txt") || basenames.includes("setup.py");
  const pyFileCount = lowerFiles.filter((f) => f.endsWith(".py")).length;

  if (hasPyProject || pyFileCount > 0) {
    let confidence: "high" | "medium" | "low" = "low";
    let reason = `Found ${pyFileCount} Python files.`;

    if (hasPyProject && pyFileCount > 0) {
      confidence = "high";
      reason = `Found Python config (${hasPyProject}) and ${pyFileCount} .py files.`;
    } else if (pyFileCount > 3) {
      confidence = "high";
      reason = `Found ${pyFileCount} Python files.`;
    } else if (pyFileCount > 0) {
      confidence = "medium";
    }

    hints.push({
      language: "Python",
      confidence,
      reason,
    });
  }

  // Go
  const hasGoMod = basenames.includes("go.mod") || basenames.includes("go.sum");
  const goFileCount = lowerFiles.filter((f) => f.endsWith(".go")).length;

  if (hasGoMod || goFileCount > 0) {
    let confidence: "high" | "medium" | "low" = "low";
    let reason = `Found ${goFileCount} Go files.`;

    if (hasGoMod && goFileCount > 0) {
      confidence = "high";
      reason = `Found go.mod and ${goFileCount} Go files.`;
    } else if (goFileCount > 3) {
      confidence = "high";
      reason = `Found ${goFileCount} Go files.`;
    } else if (goFileCount > 0) {
      confidence = "medium";
    }

    hints.push({
      language: "Go",
      confidence,
      reason,
    });
  }

  // Rust
  const hasCargo = basenames.includes("cargo.toml");
  const rustFileCount = lowerFiles.filter((f) => f.endsWith(".rs")).length;

  if (hasCargo || rustFileCount > 0) {
    hints.push({
      language: "Rust",
      confidence: hasCargo && rustFileCount > 0 ? "high" : "medium",
      reason: `Found ${hasCargo ? "Cargo.toml and " : ""}${rustFileCount} Rust files.`,
    });
  }

  if (hints.length === 0) {
    hints.push({
      language: "Unknown",
      confidence: "low",
      reason: "No recognized language configuration or source files found.",
    });
  }

  return hints;
}
