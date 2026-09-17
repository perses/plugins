// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License").

import { describe, expect, it } from 'vitest';

import { sanitizeHTML } from './MarkdownPanel';

describe('sanitizeHTML external link hook', () => {
  it('forces target=_blank on absolute https links from markdown', () => {
    const html = '<p><a href="https://example.com/path">External</a></p>';
    const out = sanitizeHTML(html);
    expect(out).toContain('href="https://example.com/path"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('keeps relative links same-tab by default', () => {
    const html = '<p><a href="/explore?x=1">Explore</a></p>';
    const out = sanitizeHTML(html);
    expect(out).toContain('href="/explore?x=1"');
    expect(out).not.toContain('target="_blank"');
  });

  it('honors explicit target=_blank on relative links', () => {
    const html = '<p><a href="/projects/irt/dashboards/x" target="_blank">Dash</a></p>';
    const out = sanitizeHTML(html);
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });
});
