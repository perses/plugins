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

import { ansiToSanitizedHtml, stripAnsi } from './ansi';

describe('ansi utilities', () => {
  describe('ansiToSanitizedHtml', () => {
    it('should return null for plain text without ANSI codes', () => {
      expect(ansiToSanitizedHtml('hello world')).toBeNull();
    });

    it('should convert red ANSI color to HTML with class', () => {
      const input = '\x1b[31mERROR\x1b[0m';
      const result = ansiToSanitizedHtml(input);
      expect(result).not.toBeNull();
      expect(result).toContain('ansi-red-fg');
      expect(result).toContain('ERROR');
    });

    it('should strip <script> tags for XSS prevention', () => {
      const input = '\x1b[31m<script>alert("xss")</script>ERROR\x1b[0m';
      const result = ansiToSanitizedHtml(input);
      expect(result).not.toBeNull();
      expect(result).not.toContain('<script>');
      expect(result).toContain('ERROR');
    });

    it('should handle multiple colors on one line', () => {
      const input = '\x1b[31mERROR\x1b[0m \x1b[32mrecovered\x1b[0m';
      const result = ansiToSanitizedHtml(input);
      expect(result).not.toBeNull();
      expect(result).toContain('ansi-red-fg');
      expect(result).toContain('ansi-green-fg');
      expect(result).toContain('ERROR');
      expect(result).toContain('recovered');
    });

    it('should handle bright color codes', () => {
      const input = '\x1b[91mtext\x1b[0m';
      const result = ansiToSanitizedHtml(input);
      expect(result).not.toBeNull();
      expect(result).toContain('ansi-bright-red-fg');
      expect(result).toContain('text');
    });

    it('should handle 256-color codes with inline style', () => {
      const input = '\x1b[38;5;196mtext\x1b[0m';
      const result = ansiToSanitizedHtml(input);
      expect(result).not.toBeNull();
      expect(result).toContain('style');
      expect(result).toContain('text');
    });

    it('should handle background color', () => {
      const input = '\x1b[41mhighlighted\x1b[0m';
      const result = ansiToSanitizedHtml(input);
      expect(result).not.toBeNull();
      expect(result).toContain('ansi-red-bg');
      expect(result).toContain('highlighted');
    });

    it('should handle bold text', () => {
      const input = '\x1b[1mIMPORTANT\x1b[0m';
      const result = ansiToSanitizedHtml(input);
      expect(result).not.toBeNull();
      expect(result).toContain('font-weight:bold');
      expect(result).toContain('IMPORTANT');
    });

    it('should preserve plain text mixed with ANSI colored text', () => {
      const input = 'plain \x1b[31mred\x1b[0m plain';
      const result = ansiToSanitizedHtml(input);
      expect(result).not.toBeNull();
      expect(result).toContain('plain');
      expect(result).toContain('ansi-red-fg');
      expect(result).toContain('red');
    });

    it('should strip event handler XSS via onerror', () => {
      const input = '\x1b[31m<img src=x onerror="alert(1)">\x1b[0m';
      const result = ansiToSanitizedHtml(input);
      expect(result).not.toBeNull();
      // ansi_up escapes < and > so no actual <img> tag is rendered
      expect(result).not.toContain('<img');
      // The content is HTML-escaped, so it is safe text, not executable
      expect(result).toContain('&lt;img');
    });

    it('should strip malicious javascript href XSS', () => {
      const input = '\x1b[31m<a href="javascript:alert(1)">click</a>\x1b[0m';
      const result = ansiToSanitizedHtml(input);
      expect(result).not.toBeNull();
      // ansi_up escapes < and > so no actual <a> tag is rendered
      expect(result).not.toContain('<a ');
      expect(result).not.toContain('</a>');
      // The content is HTML-escaped, so it is safe text, not executable
      expect(result).toContain('&lt;a');
    });

    it('should return null for empty string', () => {
      expect(ansiToSanitizedHtml('')).toBeNull();
    });

    it('should handle a lone reset code gracefully', () => {
      const result = ansiToSanitizedHtml('\x1b[0m');
      // Should not crash; result is either null or empty/minimal HTML
      if (result !== null) {
        expect(typeof result).toBe('string');
      }
    });
  });

  describe('stripAnsi', () => {
    it('should remove ANSI codes from text', () => {
      const input = '\x1b[31mERROR\x1b[0m something went wrong';
      expect(stripAnsi(input)).toBe('ERROR something went wrong');
    });

    it('should return plain text unchanged', () => {
      expect(stripAnsi('hello world')).toBe('hello world');
    });

    it('should strip multiple ANSI codes including bold and color', () => {
      expect(stripAnsi('\x1b[1m\x1b[31mBOLD RED\x1b[0m')).toBe('BOLD RED');
    });

    it('should strip 256-color codes', () => {
      expect(stripAnsi('\x1b[38;5;196mtext\x1b[0m')).toBe('text');
    });

    it('should preserve non-ANSI special characters', () => {
      expect(stripAnsi('hello [world] {test}')).toBe('hello [world] {test}');
    });
  });
});
