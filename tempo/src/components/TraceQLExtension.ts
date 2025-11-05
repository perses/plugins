// Copyright 2024 The Perses Authors
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

import { LRLanguage } from '@codemirror/language';
import { parser } from '@grafana/lezer-traceql';
import { CompletionContext } from '@codemirror/autocomplete';
import { Extension } from '@uiw/react-codemirror';
import { AbsoluteTimeRange } from '@perses-dev/core';
import { TempoClient } from '../model/tempo-client';
import { traceQLHighlight } from './highlight';
import { complete } from './complete';

function traceQLLanguage(): LRLanguage {
  return LRLanguage.define({
    parser: parser.configure({
      props: [traceQLHighlight],
    }),
    languageData: {
      closeBrackets: { brackets: ['(', '[', '{', "'", '"', '`'] },
      commentTokens: { line: '//' },
    },
  });
}

export interface CompletionConfig {
  /** a TempoClient instance, can be created with TempoDatasource.createClient() */
  client?: TempoClient;

  /** search for tag values in a given time range */
  timeRange?: AbsoluteTimeRange;

  /** limit number of returned tag values */
  limit?: number;

  /**
   * stop search early if number of cache hits exceeds this setting
   * https://grafana.com/docs/tempo/latest/api_docs/#search-tag-values-v2
   */
  maxStaleValues?: number;
}

export function TraceQLExtension(completionCfg: CompletionConfig): Array<LRLanguage | Extension> {
  const language = traceQLLanguage();
  const completion = language.data.of({
    autocomplete: (ctx: CompletionContext) =>
      complete(completionCfg, ctx).catch((e) => console.error('error during TraceQL auto-complete', e)),
  });
  return [language, completion];
}
