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

import { getSeverityWeight, hashStringToColor, getLabelColor, SEVERITY_ORDER } from './label-colors';

describe('getSeverityWeight', () => {
  it('returns correct weight for known severity levels', () => {
    expect(getSeverityWeight('critical')).toBe(0);
    expect(getSeverityWeight('error')).toBe(1);
    expect(getSeverityWeight('warning')).toBe(2);
    expect(getSeverityWeight('info')).toBe(3);
  });

  it('handles abbreviations case-insensitively', () => {
    expect(getSeverityWeight('CRITICAL')).toBe(0);
    expect(getSeverityWeight('Warn')).toBe(2);
    expect(getSeverityWeight('crit')).toBe(0);
    expect(getSeverityWeight('fatal')).toBe(0);
  });

  it('returns max weight for unknown values', () => {
    expect(getSeverityWeight('banana')).toBe(SEVERITY_ORDER.length);
  });
});

describe('hashStringToColor', () => {
  it('returns a valid HSL color string', () => {
    const color = hashStringToColor('test');
    expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it('returns the same color for the same input', () => {
    expect(hashStringToColor('foo')).toBe(hashStringToColor('foo'));
  });

  it('returns different colors for different inputs', () => {
    expect(hashStringToColor('foo')).not.toBe(hashStringToColor('bar'));
  });
});

describe('getLabelColor', () => {
  it('returns severity color for severity mode', () => {
    const color = getLabelColor('critical', { labelKey: 'severity', mode: 'severity' });
    expect(color).toBe('#d32f2f');
  });

  it('returns hash color for auto mode', () => {
    const color = getLabelColor('my-value', { labelKey: 'env', mode: 'auto' });
    expect(color).toMatch(/^hsl\(/);
  });

  it('returns fallback for manual mode without override match', () => {
    const color = getLabelColor('unmatched', { labelKey: 'env', mode: 'manual' });
    expect(color).toBe('#9e9e9e');
  });

  it('applies overrides before mode-based color', () => {
    const color = getLabelColor('prod', {
      labelKey: 'env',
      mode: 'auto',
      overrides: [{ value: 'prod', isRegex: false, color: '#ff0000' }],
    });
    expect(color).toBe('#ff0000');
  });

  it('supports regex overrides', () => {
    const color = getLabelColor('staging-us-east', {
      labelKey: 'env',
      mode: 'auto',
      overrides: [{ value: '^staging', isRegex: true, color: '#00ff00' }],
    });
    expect(color).toBe('#00ff00');
  });

  it('falls through to mode color when regex override does not match', () => {
    const color = getLabelColor('production', {
      labelKey: 'env',
      mode: 'severity',
      overrides: [{ value: '^staging', isRegex: true, color: '#00ff00' }],
    });
    expect(color).not.toBe('#00ff00');
  });

  it('handles invalid regex gracefully', () => {
    const color = getLabelColor('test', {
      labelKey: 'env',
      mode: 'auto',
      overrides: [{ value: '[invalid', isRegex: true, color: '#00ff00' }],
    });
    expect(color).toMatch(/^hsl\(/);
  });
});
