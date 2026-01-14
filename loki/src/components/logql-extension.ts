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

import { LRLanguage } from '@codemirror/language';
import { parser } from '@grafana/lezer-logql';
import { CompletionContext } from '@codemirror/autocomplete';
import { Extension } from '@uiw/react-codemirror';
import { AbsoluteTimeRange } from '@perses-dev/core';
import { LokiClient } from '../model';
import { logqlHighlight } from './logql-highlight';
import { complete } from './complete';

function logqlLanguage(): LRLanguage {
  return LRLanguage.define({
    parser: parser.configure({
      props: [logqlHighlight],
    }),
    languageData: {
      closeBrackets: { brackets: ['(', '[', '{', "'", '"', '`'] },
      commentTokens: { line: '#' },
    },
  });
}

export interface CompletionConfig {
  /** a LokiClient instance, can be created with LokiDatasource.createClient() */
  client?: LokiClient;

  /** search for label values in a given time range */
  timeRange?: AbsoluteTimeRange;
}

export function LogQLExtension(completionCfg?: CompletionConfig): Array<LRLanguage | Extension> {
  const language = logqlLanguage();

  // Only add autocomplete if config is provided
  if (completionCfg) {
    const completion = language.data.of({
      autocomplete: (ctx: CompletionContext) =>
        complete(completionCfg, ctx).catch((e) => {
          console.error('error during LogQL auto-complete', e);
          return null;
        }),
    });
    return [language, completion];
  }

  return [language];
}
