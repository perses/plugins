// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/** A model of a filter bar for common tracing attributes. All attributes are combined with AND, the values of an attribute are combined with OR. */
export interface Filter {
  serviceName: string[];
  spanName: string[];
  namespace: string[];
  status: string[];
  spanDuration: DurationField;
  traceDuration: DurationField;
  customMatchers: string[];
}

export interface DurationField {
  min?: string;
  max?: string;
}

/** split a string by whitespace, except when inside quotes */
export function splitByUnquotedWhitespace(x: string): string[] {
  let quote = false;
  let from = 0;
  const chunks: string[] = [];
  for (let i = 0; i < x.length; i++) {
    if (x[i] === '"' && x[i - 1] !== '\\') {
      quote = !quote;
    } else if (x[i] === ' ' && !quote) {
      chunks.push(x.slice(from, i));
      from = i + 1;
    }
  }
  chunks.push(x.slice(from, x.length));
  return chunks.filter((x) => x);
}
