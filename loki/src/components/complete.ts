// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Completion, CompletionContext, CompletionResult, insertCompletionText } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { SyntaxNode, Tree } from '@lezer/common';
import {
  Selector,
  Matchers,
  Matcher,
  Identifier,
  Eq,
  Neq,
  Re,
  Nre,
  String as StringType,
  Pipe,
} from '@grafana/lezer-logql';
import { EditorView } from '@uiw/react-codemirror';
import { toUnixSeconds } from '../model';
import { CompletionConfig } from './logql-extension';

/** CompletionScope specifies the completion kind, e.g. whether to complete label names or values */
type CompletionScope =
  | { kind: 'LabelName' }
  | { kind: 'LabelValue'; label: string }
  | { kind: 'PipeFunction'; afterPipe: boolean; hasSpace: boolean; afterExclamation: boolean };

/**
 * CompletionInfo specifies the identified scope and position of the completion in the current editor text.
 */
export interface CompletionInfo {
  scope: CompletionScope;
  from: number;
  to?: number;
}

const quoteChars = ['"', '`'];
const defaultQuoteChar = '"';
const ERROR_NODE = 0; // Lezer parser creates error nodes for incomplete/malformed syntax

export async function complete(
  completionCfg: CompletionConfig,
  { state, pos }: CompletionContext
): Promise<CompletionResult | null> {
  // First, identify the completion scope
  const completion = identifyCompletion(state, pos, syntaxTree(state));
  if (!completion) {
    // No completion scope found for current cursor position.
    return null;
  }

  // Then, retrieve completion options for the identified scope (from the Loki API).
  const options = await retrieveOptions(completionCfg, completion.scope);
  return { options, from: completion.from, to: completion.to };
}

/**
 * Identify completion scope (e.g. LabelName, LabelValue) and position, based on the current node in the syntax tree.
 *
 * Function is exported for tests only.
 */
export function identifyCompletion(state: EditorState, pos: number, tree: Tree): CompletionInfo | undefined {
  const node = tree.resolveInner(pos, -1);

  switch (node.type.id) {
    case Selector:
    case Matchers:
    case Matcher:
    case Identifier:
    case Eq:
    case Neq:
    case Re:
    case Nre:
    case StringType: {
      const labelCompletion = detectLabelCompletion(state, pos, node);
      if (labelCompletion) return labelCompletion;
      break;
    }

    case ERROR_NODE: {
      // Check for pipe context first
      const pipeCompletion = detectPipeCompletion(state, node);
      if (pipeCompletion) return pipeCompletion;

      // Then check for label completion in error nodes
      const labelCompletion = detectLabelCompletion(state, pos, node);
      if (labelCompletion) return labelCompletion;
      break;
    }

    case Pipe: {
      // Pipe operator: suggest parser functions and line filters
      // Examples: {job="nginx"} |▯  or  {job="nginx"} | ▯
      const hasSpaceAfterPipe = state.sliceDoc(pos - 1, pos) === ' ';
      return {
        scope: { kind: 'PipeFunction', afterPipe: true, hasSpace: hasSpaceAfterPipe, afterExclamation: false },
        from: pos,
      };
    }
  }

  // Fallback checks for contexts not directly on a node
  const textBeforeCursor = state.sliceDoc(0, pos).trim();
  const hasSpace = state.sliceDoc(pos - 1, pos).match(/\s/) !== null;

  // Check if cursor is after a pipe operator followed by whitespace
  // This enables autocomplete after: {job="nginx"} | ▯
  if (textBeforeCursor.endsWith('|') && hasSpace) {
    return {
      scope: { kind: 'PipeFunction', afterPipe: true, hasSpace: true, afterExclamation: false },
      from: pos,
    };
  }

  // Check if cursor is after a closing brace (stream selector) followed by whitespace
  // This enables autocomplete after: {job="nginx"} ▯
  if (textBeforeCursor.endsWith('}') && hasSpace) {
    return {
      scope: { kind: 'PipeFunction', afterPipe: false, hasSpace: true, afterExclamation: false },
      from: pos,
    };
  }
}

/**
 * Retrieve completion options based on the identified completion scope.
 */
async function retrieveOptions(completionCfg: CompletionConfig, completion: CompletionScope): Promise<Completion[]> {
  switch (completion.kind) {
    case 'LabelName':
      return completeLabelName(completionCfg);

    case 'LabelValue':
      return completeLabelValue(completionCfg, completion.label);

    case 'PipeFunction':
      return completePipeFunctions(completion.afterPipe, completion.hasSpace, completion.afterExclamation);
  }
}

/**
 * Detect label name or value completion contexts within selectors.
 */
function detectLabelCompletion(state: EditorState, pos: number, node: SyntaxNode): CompletionInfo | undefined {
  switch (node.type.id) {
    case Selector:
      // Selector is the entire {label matchers} expression
      // Autocomplete at start: {▯ or empty: {}
      // Do not autocomplete if cursor is after closing brace: {job="mysql"}▯
      if (
        (node.firstChild === null || node.firstChild?.type.id === ERROR_NODE) &&
        !state.sliceDoc(node.from, pos).includes('}')
      ) {
        return { scope: { kind: 'LabelName' }, from: pos };
      }
      break;

    case Matchers: {
      // Matchers node contains all label matchers inside {}
      // Autocomplete after comma: { job="mysql",▯ or { job="mysql", ▯
      const text = state.sliceDoc(node.from, pos);
      if (text.endsWith(',') || text.endsWith(', ')) {
        return { scope: { kind: 'LabelName' }, from: pos };
      }
      break;
    }

    case Matcher:
      // Single matcher like job="mysql"
      // Autocomplete when cursor is after a complete matcher: { job="mysql" ▯
      if (node.parent?.type.id === Matchers) {
        return { scope: { kind: 'LabelName' }, from: pos };
      }
      break;

    case Identifier:
      // Identifier is a label name being typed
      // Autocomplete partial label names: { jo▯ or { job="mysql", na▯
      if (node.parent?.type.id === Matcher) {
        return { scope: { kind: 'LabelName' }, from: node.from };
      }
      break;

    case Eq:
    case Neq:
    case Re:
    case Nre:
      // Operators for label matching: =, !=, =~, !~
      // Autocomplete label values right after operator: { job=▯ or { job!=▯
      if (node.parent?.type.id === Matcher) {
        const labelNode = node.parent.firstChild;
        if (labelNode?.type.id === Identifier) {
          const label = state.sliceDoc(labelNode.from, labelNode.to);
          return { scope: { kind: 'LabelValue', label }, from: pos };
        }
      }
      break;

    case StringType:
      // String value in a matcher: { job="▯
      // Do not autocomplete if cursor is after closing quotes: { job=""▯
      if (node.parent?.type.id === Matcher && !/^".*"$/.test(state.sliceDoc(node.from, pos))) {
        const labelNode = node.parent.firstChild;
        if (labelNode?.type.id === Identifier) {
          const label = state.sliceDoc(labelNode.from, labelNode.to);
          return { scope: { kind: 'LabelValue', label }, from: node.from + 1 }; // +1 to skip opening quote
        }
      }
      break;

    case ERROR_NODE:
      // Error nodes represent incomplete or malformed syntax
      // Autocomplete incomplete value after operator: { job=mys▯ or { job="mys▯
      if (
        (node.prevSibling?.type.id === Eq ||
          node.prevSibling?.type.id === Neq ||
          node.prevSibling?.type.id === Re ||
          node.prevSibling?.type.id === Nre) &&
        node.parent?.type.id === Matcher
      ) {
        const labelNode = node.parent.firstChild;
        if (labelNode?.type.id === Identifier) {
          const label = state.sliceDoc(labelNode.from, labelNode.to);
          // Skip leading quote if present: { name="HT▯
          const from = quoteChars.includes(state.sliceDoc(node.from, node.from + 1)) ? node.from + 1 : node.from;
          return { scope: { kind: 'LabelValue', label }, from };
        }
      }

      // Autocomplete partial label name: { j▯ or { job="mysql", n▯
      if (node.parent?.type.id === Selector || node.parent?.type.id === Matchers) {
        return { scope: { kind: 'LabelName' }, from: node.from };
      }
      break;
  }

  return undefined;
}

/**
 * Detect pipe function completion contexts (line filters, parsers, formatters).
 */
function detectPipeCompletion(state: EditorState, node: SyntaxNode): CompletionInfo | undefined {
  // Check if we're in an error node right after a pipe operator
  // This handles cases like: {job="nginx"} | !▯
  if (node.prevSibling?.type.id === Pipe) {
    return {
      scope: { kind: 'PipeFunction', afterPipe: true, hasSpace: true, afterExclamation: false },
      from: node.from,
    };
  }

  // Check if we're after selector with space and text starts with !
  // This handles cases like: {job="nginx"} !▯
  const errorText = state.sliceDoc(node.from, node.to);
  if (errorText.startsWith('!')) {
    const textBeforeError = state.sliceDoc(0, node.from).trim();
    if (textBeforeError.endsWith('}')) {
      return {
        scope: { kind: 'PipeFunction', afterPipe: false, hasSpace: true, afterExclamation: true },
        from: node.from,
      };
    }
  }

  return undefined;
}

/**
 * Complete LogQL pipe functions, line filters, and parser functions.
 * Context-aware suggestions based on LogQL syntax:
 * - After "{} ": Show all line filters (|=, !=, |~, !~) + parsers (with | prefix)
 * - After "{} !": Show ONLY != and !~
 * - After "{} |": Show only pipe-based filters WITHOUT the | (=, ~) + parsers
 * - After "{} | ": Show ONLY parsers, NO line filters
 */
function completePipeFunctions(afterPipe: boolean, hasSpace: boolean, afterExclamation: boolean): Completion[] {
  const completions: Completion[] = [];

  // Line filter operators that START with pipe: |= and |~
  const pipeLineFilters = [
    { operator: '|=', detail: 'Line contains' },
    { operator: '|~', detail: 'Line matches regex' },
  ];

  // Line filter operators that DON'T start with pipe: != and !~
  const nonPipeLineFilters = [
    { operator: '!=', detail: 'Line does not contain' },
    { operator: '!~', detail: 'Line does not match regex' },
  ];

  // Context: After "{} !" - Show ONLY != and !~
  if (afterExclamation) {
    nonPipeLineFilters.forEach(({ operator, detail }) => {
      completions.push(createLineFilterCompletion(operator, detail));
    });
    return completions; // Don't show parsers after !
  }

  // Context 1: After "{} | " (pipe + space) - ONLY parsers, NO line filters
  if (afterPipe && hasSpace) {
    // Don't show any line filters
  }
  // Context 2: After "{} |" (pipe, no space) - Show = and ~ (without pipe prefix)
  else if (afterPipe && !hasSpace) {
    pipeLineFilters.forEach(({ operator, detail }) => {
      // Strip the | since user already typed it
      const strippedOp = operator.replace('|', '');
      completions.push(createLineFilterCompletion(strippedOp, detail));
    });
  }
  // Context 3: After "{} " (no pipe) - Show ALL line filters with full syntax
  else {
    [...pipeLineFilters, ...nonPipeLineFilters].forEach(({ operator, detail }) => {
      completions.push(createLineFilterCompletion(operator, detail));
    });
  }

  // Parser functions and pipe operations: always show
  // Add pipe prefix when not after pipe (e.g., "{} " needs "| json" not " json")
  const parserPrefix = !afterPipe ? '| ' : hasSpace ? '' : ' ';

  // Parsing expressions: Extract structured data
  const parsingExpressions = ['json', 'logfmt', 'pattern', 'regexp', 'unpack', 'unwrap'];
  parsingExpressions.forEach((parser) => {
    completions.push({
      label: `${parserPrefix}${parser}`,
      type: 'function',
      boost: 5,
    });
  });

  // Formatting and labels expressions: Format output and manipulate labels
  const formattingAndLabels = ['line_format', 'label_format', 'decolorize', 'drop', 'keep'];
  formattingAndLabels.forEach((expr) => {
    completions.push({
      label: `${parserPrefix}${expr}`,
      type: 'method',
    });
  });

  return completions;
}

async function completeLabelName(completionCfg: CompletionConfig): Promise<Completion[]> {
  if (!completionCfg.client) {
    return [];
  }

  const start = completionCfg.timeRange?.start
    ? toUnixSeconds(new Date(completionCfg.timeRange.start).getTime())
    : undefined;
  const end = completionCfg.timeRange?.end ? toUnixSeconds(new Date(completionCfg.timeRange.end).getTime()) : undefined;

  try {
    const response = await completionCfg.client.labels(start, end);
    if (response.status === 'success') {
      return response.data.map((label: string) => ({ label }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching label names:', error);
    return [];
  }
}

async function completeLabelValue(completionCfg: CompletionConfig, label: string): Promise<Completion[]> {
  if (!completionCfg.client) {
    return [];
  }

  const start = completionCfg.timeRange?.start
    ? toUnixSeconds(new Date(completionCfg.timeRange.start).getTime())
    : undefined;
  const end = completionCfg.timeRange?.end ? toUnixSeconds(new Date(completionCfg.timeRange.end).getTime()) : undefined;

  try {
    const response = await completionCfg.client.labelValues(label, start, end);
    if (response.status === 'success') {
      return response.data.map((value: string) => ({
        label: value ?? '',
        displayLabel: value ?? '(empty string)',
        apply: applyQuotedCompletion,
      }));
    }
    return [];
  } catch (error) {
    console.error(`Error fetching values for label ${label}:`, error);
    return [];
  }
}

/**
 * Create a line filter completion with consistent cursor positioning.
 */
function createLineFilterCompletion(operator: string, detail: string): Completion {
  return {
    label: `${operator} ""`,
    detail,
    apply: (view, _completion, from, to) => {
      const insert = `${operator} ""`;
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + insert.length - 1 },
      });
    },
    type: 'text',
    boost: 10,
  };
}

function escapeString(input: string, quoteChar: string) {
  // do not escape raw strings (when using backticks)
  if (quoteChar === '`') {
    return input;
  }

  let escaped = input;
  // escape backslashes and quotes
  escaped = escaped.replaceAll('\\', '\\\\');
  escaped = escaped.replaceAll('"', '\\"');
  return escaped;
}

/**
 * Add quotes to the completion text in case quotes are not present already.
 * This handles the following cases:
 * { name=HTTP
 * { name="x
 * { name="x" where cursor is after the 'x'
 */
export function applyQuotedCompletion(view: EditorView, completion: Completion, from: number, to: number): void {
  let quoteChar = defaultQuoteChar;
  if (quoteChars.includes(view.state.sliceDoc(from - 1, from))) {
    quoteChar = view.state.sliceDoc(from - 1, from);
    from--;
  }
  if (quoteChars.includes(view.state.sliceDoc(to, to + 1))) {
    quoteChar = view.state.sliceDoc(to, to + 1);
    to++;
  }

  // When using raw strings (`), we cannot escape a backtick.
  // Therefore, switch the quote character.
  if (completion.label.includes('`')) {
    quoteChar = '"';
  }

  const insertText = `${quoteChar}${escapeString(completion.label, quoteChar)}${quoteChar}`;
  view.dispatch(insertCompletionText(view.state, insertText, from, to));
}
