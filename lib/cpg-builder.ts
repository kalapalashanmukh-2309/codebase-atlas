/**
 * lib/cpg-builder.ts
 *
 * Code Property Graph (CPG) Builder for Codebase Atlas (V4).
 * Combines:
 *   1. AST Structural Nodes (Classes, Functions, Methods, Variables)
 *   2. Control Flow Graph (CFG) Basic Blocks & Execution Edges (CONTROL_FLOW)
 *   3. Program Dependency Graph (PDG) Data Flow & Variable Usage (DATA_FLOW)
 */

import * as ts from "typescript";
import { type CodeNode, type CodeEdge, buildGraph, type BuiltGraph } from "./graph-builder";

export interface CpgBlockNode extends CodeNode {
  blockType?: "entry" | "condition" | "loop" | "return" | "assignment" | "exit";
  conditionExpr?: string;
}

export interface CpgEdge extends CodeEdge {
  flowCategory?: "AST" | "CONTROL_FLOW" | "DATA_FLOW";
  variableName?: string;
}

export interface CodePropertyGraph {
  nodes: CpgBlockNode[];
  edges: CpgEdge[];
  cfgEntryNodes: string[];
  dataDependencies: { sourceVar: string; targetVar: string; file: string; line: number }[];
}

/**
 * Builds a unified Code Property Graph (CPG = AST + CFG + PDG) from source file contents.
 */
export function buildCodePropertyGraph(files: { path: string; content: string }[]): CodePropertyGraph {
  const baseGraph: BuiltGraph = buildGraph(files, "detailed");

  const cpgNodes: CpgBlockNode[] = [...baseGraph.nodes];
  const cpgEdges: CpgEdge[] = baseGraph.edges.map((e) => ({
    ...e,
    flowCategory: "AST" as const,
  }));

  const cfgEntryNodes: string[] = [];
  const dataDependencies: { sourceVar: string; targetVar: string; file: string; line: number }[] = [];

  for (const fileItem of files) {
    const sourceFile = ts.createSourceFile(
      fileItem.path,
      fileItem.content,
      ts.ScriptTarget.Latest,
      true
    );

    function walkAst(node: ts.Node, currentContainerId?: string) {
      // 1. Control Flow Graph (CFG): Branching constructs (if, for, while, try)
      if (ts.isIfStatement(node)) {
        const conditionText = node.expression.getText(sourceFile);
        const ifNodeId = `${fileItem.path}::CFG_IF_${node.getStart(sourceFile)}`;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

        cpgNodes.push({
          id: ifNodeId,
          name: `If (${conditionText})`,
          label: `🔀 If (${conditionText})`,
          type: "function",
          path: fileItem.path,
          blockType: "condition",
          conditionExpr: conditionText,
          startLine: line,
        });

        if (currentContainerId) {
          cpgEdges.push({
            id: `${currentContainerId}-[CONTROL_FLOW]->${ifNodeId}`,
            source: currentContainerId,
            target: ifNodeId,
            from: currentContainerId,
            to: ifNodeId,
            type: "calls",
            label: "CONTROL_FLOW",
            flowCategory: "CONTROL_FLOW",
            resolution: { status: "verified", method: "ast" },
          });
        }
      } else if (ts.isForStatement(node) || ts.isWhileStatement(node)) {
        const loopNodeId = `${fileItem.path}::CFG_LOOP_${node.getStart(sourceFile)}`;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

        cpgNodes.push({
          id: loopNodeId,
          name: "Loop Block",
          label: "🔄 Loop",
          type: "function",
          path: fileItem.path,
          blockType: "loop",
          startLine: line,
        });

        if (currentContainerId) {
          cpgEdges.push({
            id: `${currentContainerId}-[CONTROL_FLOW]->${loopNodeId}`,
            source: currentContainerId,
            target: loopNodeId,
            from: currentContainerId,
            to: loopNodeId,
            type: "calls",
            label: "CONTROL_FLOW",
            flowCategory: "CONTROL_FLOW",
            resolution: { status: "verified", method: "ast" },
          });
        }
      }

      // 2. Program Dependency Graph (PDG): Variable declarations and assignments (DATA_FLOW)
      if (ts.isVariableDeclaration(node) && node.initializer) {
        const varName = node.name.getText(sourceFile);
        const initText = node.initializer.getText(sourceFile);
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

        const varNodeId = `${fileItem.path}::VAR_${varName}_${node.getStart(sourceFile)}`;

        cpgNodes.push({
          id: varNodeId,
          name: varName,
          label: `📌 ${varName} = ${initText.slice(0, 20)}`,
          type: "variable",
          path: fileItem.path,
          startLine: line,
        });

        dataDependencies.push({
          sourceVar: varName,
          targetVar: initText,
          file: fileItem.path,
          line,
        });

        if (currentContainerId) {
          cpgEdges.push({
            id: `${currentContainerId}-[DATA_FLOW]->${varNodeId}`,
            source: currentContainerId,
            target: varNodeId,
            from: currentContainerId,
            to: varNodeId,
            type: "uses",
            label: `DATA_FLOW (${varName})`,
            flowCategory: "DATA_FLOW",
            variableName: varName,
            resolution: { status: "verified", method: "ast" },
          });
        }
      }

      let nextContainer = currentContainerId;
      if (ts.isFunctionDeclaration(node) && node.name) {
        nextContainer = `${fileItem.path}::${node.name.text}`;
        cfgEntryNodes.push(nextContainer);
      } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        const parentClass = node.parent && ts.isClassDeclaration(node.parent) && node.parent.name ? node.parent.name.text : "";
        nextContainer = `${fileItem.path}::${parentClass ? parentClass + "." : ""}${node.name.text}`;
        cfgEntryNodes.push(nextContainer);
      }

      ts.forEachChild(node, (child) => walkAst(child, nextContainer));
    }

    walkAst(sourceFile);
  }

  return {
    nodes: cpgNodes,
    edges: cpgEdges,
    cfgEntryNodes,
    dataDependencies,
  };
}
