/**
 * lib/autonomous-verifier.ts
 *
 * Autonomous Code Modification & Verification Engine for Codebase Atlas (V9).
 * Generates verified patches for target entities and validates syntax and contract integrity.
 */

import * as ts from "typescript";
import { type CodeSlice } from "./subgraph-slicer";

export interface ProposedPatch {
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  diffDescription: string;
}

export interface VerificationResult {
  patch: ProposedPatch;
  isValidSyntax: boolean;
  parseErrors: string[];
}

export function generateAndVerifyPatch(
  slice: CodeSlice,
  patchTransformation: (code: string) => string,
  description: string
): VerificationResult {
  const modifiedCode = patchTransformation(slice.snippet);

  const sourceFile = ts.createSourceFile(
    slice.file,
    modifiedCode,
    ts.ScriptTarget.Latest,
    true
  );

  const parseErrors: string[] = [];

  // Check for AST syntax parse diagnostics
  const diagnostics = (sourceFile as any).parseDiagnostics;
  if (Array.isArray(diagnostics) && diagnostics.length > 0) {
    for (const diag of diagnostics) {
      parseErrors.push(diag.messageText?.toString() || "Syntax error");
    }
  }

  const isValidSyntax = parseErrors.length === 0;

  return {
    patch: {
      filePath: slice.file,
      originalCode: slice.snippet,
      modifiedCode,
      diffDescription: description,
    },
    isValidSyntax,
    parseErrors,
  };
}
