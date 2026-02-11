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

import { EditorState, EditorView } from '@uiw/react-codemirror';
import { parser } from '@grafana/lezer-logql';
import { LRLanguage, ensureSyntaxTree } from '@codemirror/language';
import { identifyCompletion, applyQuotedCompletion } from './complete';

const logQLExtension = LRLanguage.define({ parser: parser });

describe('complete', () => {
  describe('identifyCompletion', () => {
    it.each([
      // Empty query
      {
        expr: '',
        expected: undefined,
      },

      // Label name completions - Selector
      {
        expr: '{',
        expected: { scope: { kind: 'LabelName' }, from: 1 },
      },
      {
        expr: '{ ',
        expected: { scope: { kind: 'LabelName' }, from: 2 },
      },
      {
        expr: '{}',
        pos: 1,
        expected: { scope: { kind: 'LabelName' }, from: 1 },
      },
      // After closing brace - parser treats this as still in selector context
      {
        expr: '{}',
        expected: { scope: { kind: 'LabelName' }, from: 1 },
      },

      // Label name completions - after comma
      {
        expr: '{foo="bar",',
        expected: { scope: { kind: 'LabelName' }, from: 11 },
      },
      {
        expr: '{foo="bar", ',
        expected: { scope: { kind: 'LabelName' }, from: 12 },
      },

      // Label name completions - partial identifier
      {
        expr: '{f',
        expected: { scope: { kind: 'LabelName' }, from: 1 },
      },
      {
        expr: '{fo',
        expected: { scope: { kind: 'LabelName' }, from: 1 },
      },
      {
        expr: '{foo="bar", e',
        expected: { scope: { kind: 'LabelName' }, from: 12 },
      },

      // Label name completions - after complete matcher
      // Note: Without closing brace, parser doesn't detect this as completed matcher
      {
        expr: '{foo="bar" ',
        expected: undefined,
      },

      // Label value completions - after operator
      {
        expr: '{foo=',
        expected: { scope: { kind: 'LabelValue', label: 'foo' }, from: 5 },
      },
      {
        expr: '{foo!=',
        expected: { scope: { kind: 'LabelValue', label: 'foo' }, from: 6 },
      },
      {
        expr: '{foo=~',
        expected: { scope: { kind: 'LabelValue', label: 'foo' }, from: 6 },
      },
      {
        expr: '{foo!~',
        expected: { scope: { kind: 'LabelValue', label: 'foo' }, from: 6 },
      },

      // Label value completions - partial unquoted value
      // Note: Parser may not create ERROR_NODE for simple identifiers
      {
        expr: '{foo=ba',
        expected: undefined,
      },

      // Label value completions - inside quotes
      {
        expr: '{foo="',
        expected: { scope: { kind: 'LabelValue', label: 'foo' }, from: 6 },
      },
      // Note: Incomplete string without closing quote may not trigger completion
      {
        expr: '{foo="ba',
        expected: undefined,
      },
      {
        expr: '{foo=""',
        pos: 6,
        expected: { scope: { kind: 'LabelValue', label: 'foo' }, from: 6 },
      },
      {
        expr: '{foo=""',
        expected: undefined,
      },

      // Label value completions - with backticks
      {
        expr: '{foo=`',
        expected: { scope: { kind: 'LabelValue', label: 'foo' }, from: 6 },
      },

      // Label value completions - complex label names
      {
        expr: '{env="prod", app=',
        expected: { scope: { kind: 'LabelValue', label: 'app' }, from: 17 },
      },

      // Pipe function completions - after closing brace
      {
        expr: '{foo="bar"} ',
        expected: {
          scope: { kind: 'PipeFunction', afterPipe: false, hasSpace: true, afterExclamation: false },
          from: 12,
        },
      },

      // Pipe function completions - after pipe
      {
        expr: '{foo="bar"} |',
        expected: {
          scope: { kind: 'PipeFunction', afterPipe: true, hasSpace: false, afterExclamation: false },
          from: 13,
        },
      },
      {
        expr: '{foo="bar"} | ',
        expected: {
          scope: { kind: 'PipeFunction', afterPipe: true, hasSpace: true, afterExclamation: false },
          from: 14,
        },
      },

      // Pipe function completions - after exclamation
      {
        expr: '{foo="bar"} !',
        expected: {
          scope: { kind: 'PipeFunction', afterPipe: false, hasSpace: true, afterExclamation: true },
          from: 12,
        },
      },

      // Multiple matchers
      {
        expr: '{foo="bar", env="prod"}',
        pos: 13,
        expected: { scope: { kind: 'LabelName' }, from: 12 },
      },

      // Label with regex operator
      {
        expr: '{foo=~"bar.*"}',
        pos: 7,
        expected: { scope: { kind: 'LabelValue', label: 'foo' }, from: 7 },
      },

      // After pipe with partial function - parser sees 'j' as error/label identifier
      {
        expr: '{foo="bar"} | j',
        expected: { scope: { kind: 'LabelName' }, from: 14 },
      },

      // No completion after complete query
      {
        expr: '{foo="bar"}',
        expected: undefined,
      },

      // Cursor in middle of value - parser sees this as inside the string
      {
        expr: '{foo="bar"}',
        pos: 8,
        expected: { scope: { kind: 'LabelValue', label: 'foo' }, from: 6 },
      },
    ])('should identify completion for: $expr', ({ expr, pos, expected }) => {
      if (pos === undefined) pos = expr.length;
      if (pos < 0) pos = expr.length + pos;

      const state = EditorState.create({ doc: expr, extensions: logQLExtension });
      const tree = ensureSyntaxTree(state, expr.length, 1000);
      expect(tree).not.toBeNull();
      const completion = identifyCompletion(state, pos, tree!);
      expect(completion).toEqual(expected);
    });
  });

  describe('applyQuotedCompletion', () => {
    it.each([
      // Basic quote addition
      {
        doc: '{foo=',
        completion: 'bar',
        from: 5,
        expected: '{foo="bar"',
      },

      // Quote already present - opening
      {
        doc: '{foo="',
        completion: 'bar',
        from: 6,
        expected: '{foo="bar"',
      },

      // Quote already present - cursor before opening quote
      {
        doc: '{foo="',
        completion: 'bar',
        from: 5,
        expected: '{foo="bar"',
      },

      // Quote already present - both quotes
      {
        doc: '{foo=""',
        completion: 'bar',
        from: 6,
        expected: '{foo="bar"',
      },

      // Partial value replacement
      {
        doc: '{foo=ba',
        completion: 'bar',
        from: 5,
        to: 7,
        expected: '{foo="bar"',
      },

      // Partial value in quotes replacement
      {
        doc: '{foo="ba"',
        completion: 'bar',
        from: 6,
        to: 8,
        expected: '{foo="bar"',
      },

      // Escaping - double quotes
      {
        doc: '{foo=',
        completion: 'my"value',
        from: 5,
        expected: '{foo="my\\"value"',
      },

      // Escaping - backslashes
      {
        doc: '{foo=',
        completion: 'path\\to\\file',
        from: 5,
        expected: '{foo="path\\\\to\\\\file"',
      },

      // Escaping - both quotes and backslashes
      {
        doc: '{foo=',
        completion: 'test\\"value',
        from: 5,
        expected: '{foo="test\\\\\\"value"',
      },

      // Backticks - no escaping needed
      {
        doc: '{foo=`',
        completion: 'bar',
        from: 6,
        expected: '{foo=`bar`',
      },

      // Backticks - cursor before opening backtick
      {
        doc: '{foo=`',
        completion: 'bar',
        from: 5,
        expected: '{foo=`bar`',
      },

      // Backticks - with quotes inside (no escaping)
      {
        doc: '{foo=`',
        completion: 'my"value',
        from: 6,
        expected: '{foo=`my"value`',
      },

      // Backticks - with backslashes (no escaping)
      {
        doc: '{foo=`',
        completion: 'path\\to\\file',
        from: 6,
        expected: '{foo=`path\\to\\file`',
      },

      // Value contains backtick - switch to double quotes
      {
        doc: '{foo=`',
        completion: 'value`with`backticks',
        from: 6,
        expected: '{foo="value`with`backticks"',
      },

      // Value contains backtick - switch to double quotes and escape
      {
        doc: '{foo=`',
        completion: 'value`with"quotes',
        from: 6,
        expected: '{foo="value`with\\"quotes"',
      },

      // Empty value
      {
        doc: '{foo=',
        completion: '',
        from: 5,
        expected: '{foo=""',
      },

      // Value with spaces
      {
        doc: '{foo=',
        completion: 'bar baz',
        from: 5,
        expected: '{foo="bar baz"',
      },
    ])(
      'should apply quoted completion: $completion at pos $from in "$doc"',
      ({ doc, completion, from, to, expected }) => {
        const state = EditorState.create({ doc });
        const view = new EditorView({ state });
        applyQuotedCompletion(view, { label: completion }, from, to ?? from);
        expect(view.state.doc.toString()).toBe(expected);
      }
    );
  });
});
