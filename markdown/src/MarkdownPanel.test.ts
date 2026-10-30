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

import { describe, expect, it } from 'vitest';

import { markdownToHTML, sanitizeHTML } from './MarkdownPanel';

function render(text: string, enableHtml?: boolean): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = sanitizeHTML(markdownToHTML(text, enableHtml));
  return container;
}

describe('markdownToHTML', () => {
  it('escapes raw HTML by default', () => {
    const container = render('Expected format: <host>:<port>');
    expect(container.querySelector('p')?.textContent).toBe('Expected format: <host>:<port>');
  });

  it('escapes block-level HTML when disabled', () => {
    const container = render('<details><summary>More</summary>Hidden</details>', false);
    expect(container.querySelector('details')).toBeNull();
    expect(container.textContent).toContain('<details><summary>More</summary>Hidden</details>');
  });

  it('still renders markdown when HTML is disabled', () => {
    const container = render('**bold** `code` [link](https://example.com) <https://perses.dev>');
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('code')?.textContent).toBe('code');
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://example.com');
    expect(links[1]).toHaveAttribute('href', 'https://perses.dev');
  });

  it('renders raw HTML when enabled', () => {
    const container = render('<details><summary>More</summary>Hidden</details>', true);
    expect(container.querySelector('details summary')?.textContent).toBe('More');
  });

  it('sanitizes unsafe raw HTML when enabled', () => {
    const container = render('<img src="x" onerror="alert(1)"><script>alert(2)</script>', true);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).not.toHaveAttribute('onerror');
  });
});
