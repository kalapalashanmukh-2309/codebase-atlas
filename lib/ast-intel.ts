/**
 * lib/ast-intel.ts
 *
 * Repository-wide function intelligence module. Uses language plugins (lib/language-plugins.ts)
 * to map function names to exact definition locations, line ranges, export flags,
 * call sites, caller functions, and total invocation counts across multiple languages.
 */

import { findLanguagePlugin, type FunctionInfo, type CallInfo } from "@/lib/language-plugins";

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
  callerFunction?: string;
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
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a repository-wide function index mapping each function name to its
 * definitions (file + line range + export status), call sites, and total call counts.
 * Uses language plugins for multi-language support.
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

    const plugin = findLanguagePlugin(file.path);
    if (!plugin) continue; // Unknown language: include file in repo tree, skip function extraction

    // 1. Extract definitions via language plugin
    if (plugin.extractFunctions) {
      const funcs: FunctionInfo[] = plugin.extractFunctions(file);
      for (const fn of funcs) {
        if (!fn.name) continue;
        const detail = getOrCreateDetail(fn.name);
        detail.definitions.push({
          file: file.path,
          name: fn.name,
          lineStart: fn.lineStart,
          lineEnd: fn.lineEnd,
          isExport: Boolean(fn.isExport),
        });
      }
    }

    // 2. Extract function calls via language plugin
    if (plugin.extractCalls) {
      const calls: CallInfo[] = plugin.extractCalls(file);
      for (const call of calls) {
        if (!call.calleeName) continue;
        const detail = getOrCreateDetail(call.calleeName);
        detail.callSites.push({
          file: file.path,
          line: call.line,
          callerFunction: call.callerFunction,
        });
        detail.callCount += 1;
      }
    }
  }

  return indexMap;
}

/**
 * Serializes Map<string, FunctionDetail> into JSON-compatible FunctionIndexRecord.
 */
export function buildFunctionIndexRecord(
  files: { path: string; content: string }[]
): FunctionIndexRecord {
  const map = buildFunctionIndex(files);
  const record: FunctionIndexRecord = {};

  for (const [name, detail] of map.entries()) {
    record[name] = {
      name: detail.name,
      definitions: detail.definitions.map((d) => ({
        file: d.file,
        lineStart: d.lineStart,
        lineEnd: d.lineEnd,
        isExport: d.isExport,
      })),
      callSites: detail.callSites.map((c) => ({
        file: c.file,
        line: c.line,
        callerFunction: c.callerFunction,
      })),
      callCount: detail.callCount,
    };
  }

  return record;
}
