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

// None of these schemes can execute a script in the current origin. Besides the web and communication schemes, it
// includes the deep links of applications commonly used from dashboards, which are handed off to the operating system.
// Keep it aligned with the list of @perses-dev/components (components/src/utils/url.ts in perses/shared) and of the
// Perses API (internal/api/validate/link.go in perses/perses).
// TODO: import sanitizeUrl from @perses-dev/components once the version that exports it is released, and remove this file.
const SAFE_URL_PROTOCOLS = new Set([
  'http:',
  'https:',
  'mailto:',
  'tel:',
  'sms:',
  'slack:',
  'msteams:',
  'vscode:',
  'vscode-insiders:',
  'zoommtg:',
]);

// Only used to resolve relative URLs, so that they are parsed the way a browser resolves them against the page.
const RELATIVE_URL_BASE = 'http://perses.local';

/**
 * Returns the URL when it is safe to use as the `href` of a link built from user-provided data (relative URL or one of
 * the allowed schemes), undefined otherwise. Any other scheme, such as `javascript:`, `data:` or `vbscript:`, is unsafe.
 * It must be applied to the final URL, after any variable interpolation, since variable values can be provided by the
 * user (e.g. through the URL query parameters).
 */
export function sanitizeUrl(url: string | undefined): string | undefined {
  if (url === undefined) {
    return undefined;
  }
  try {
    if (SAFE_URL_PROTOCOLS.has(new URL(url, RELATIVE_URL_BASE).protocol)) {
      return url;
    }
  } catch {
    // ignored: an unparsable URL is unsafe.
  }
  return undefined;
}
