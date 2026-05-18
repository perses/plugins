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

import { AnsiUp } from 'ansi_up';
import DOMPurify from 'dompurify';

const ansiUp = new AnsiUp();
ansiUp.use_classes = true;

const ESC = String.fromCharCode(27);
const ANSI_REGEX = new RegExp(ESC + '\\[[0-9;]*m');

export function ansiToSanitizedHtml(text: string): string | null {
  if (!ANSI_REGEX.test(text)) {
    return null;
  }
  const html = ansiUp.ansi_to_html(text);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class', 'style'],
  });
}

const ANSI_STRIP_REGEX = new RegExp(ESC + '\\[[0-9;]*m', 'g');

export function stripAnsi(text: string): string {
  return text.replace(ANSI_STRIP_REGEX, '');
}
