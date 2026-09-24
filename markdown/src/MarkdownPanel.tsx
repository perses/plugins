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

import type { Theme } from '@mui/material';
import { Box } from '@mui/material';
import type { PersesChartsTheme } from '@perses-dev/components';
import { useChartsTheme } from '@perses-dev/components';
import type { PanelProps } from '@perses-dev/plugin-system';
import { useReplaceVariablesInString } from '@perses-dev/plugin-system';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { ReactElement } from 'react';
import React, { useMemo } from 'react';

import type { MarkdownPanelOptions } from './markdown-panel-model';

export type MarkdownPanelProps = PanelProps<MarkdownPanelOptions>;

// Isolated DOMPurify instance so afterSanitizeAttributes does not affect other plugins
// that import the default DOMPurify singleton (review: jgbernalp / shahrokni on #815).
// Default export is a factory: DOMPurify(window) returns a separate purifier.
const markdownPurifier = typeof window !== 'undefined' ? DOMPurify(window) : DOMPurify;

/**
 * Ensure markdown links open safely (markdown plugin only):
 * - absolute http(s) URLs → target=_blank + rel=noopener noreferrer
 * - explicit target=_blank kept / reinforced
 * - relative in-app paths (e.g. /explore) stay same-tab unless target=_blank was set
 */
markdownPurifier.addHook('afterSanitizeAttributes', (node) => {
  if (!(node instanceof Element) || node.tagName !== 'A') {
    return;
  }
  const href = node.getAttribute('href') ?? '';
  const isAbsoluteHttp = /^https?:\/\//i.test(href) || href.startsWith('//');
  const wantsBlank = node.getAttribute('target') === '_blank' || isAbsoluteHttp;
  if (wantsBlank) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

function createMarkdownPanelStyles(theme: Theme, chartsTheme: PersesChartsTheme): Record<string, unknown> {
  return {
    padding: `${chartsTheme.container.padding.default}px`,
    // Make the content scrollable
    height: '100%',
    overflowY: 'auto',
    // Ignore top margin on the first element.
    '& :first-of-type': {
      marginTop: 0,
    },
    // Styles for headers
    '& h1': {
      fontSize: '2em',
    },
    // Styles for <code>
    '& code': { fontSize: '0.85em' },
    '& :not(pre) code': {
      padding: '0.2em 0.4em',
      backgroundColor: theme.palette.grey[100],
      borderRadius: '4px',
    },
    '& pre': {
      padding: '1.2em',
      backgroundColor: theme.palette.grey[100],
      borderRadius: '4px',
    },
    // Styles for <table>
    '& table, & th, & td': {
      padding: '0.6em',
      border: `1px solid ${theme.palette.grey[300]}`,
      borderCollapse: 'collapse',
    },
    // Styles for <li>
    '& li + li': {
      marginTop: '0.25em',
    },
    // Styles for <a>
    '& a': {
      color: theme.palette.primary.main,
    },
  };
}

// Convert markdown to HTML
// Supports original markdown and GitHub Flavored markdown
function markdownToHTML(text: string): string {
  return marked.parse(text, { gfm: true, async: false });
}

// Prevent XSS attacks by removing the vectors for attacks
export function sanitizeHTML(html: string): string {
  return markdownPurifier.sanitize(html, {
    ADD_ATTR: ['target', 'rel'],
  });
}

export function MarkdownPanel(props: MarkdownPanelProps): ReactElement {
  const {
    spec: { text },
  } = props;
  const chartsTheme = useChartsTheme();

  const textAfterVariableReplacement = useReplaceVariablesInString(text);

  const html = useMemo(() => markdownToHTML(textAfterVariableReplacement ?? ''), [textAfterVariableReplacement]);
  const sanitizedHTML = useMemo(() => sanitizeHTML(html), [html]);

  return (
    <Box
      sx={(theme) => createMarkdownPanelStyles(theme, chartsTheme)}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
}
