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

import { TimeSeries } from '@perses-dev/core';
import { colorFromThresholds, interpolateLabel, isSafeImageUrl } from './panelUtils';

function makeSeries(labels: Record<string, string>, values: Array<[number, number | null]>): TimeSeries {
  return { labels, values } as unknown as TimeSeries;
}

describe('interpolateLabel', () => {
  it('replaces {{value}} with the formatted last value', () => {
    const series = makeSeries({}, [[0, 42]]);
    const result = interpolateLabel('current: {{value}}', series, undefined);
    expect(result).toContain('42');
  });

  it('replaces label placeholders from series labels', () => {
    const series = makeSeries({ instance: 'host1' }, []);
    expect(interpolateLabel('host: {{instance}}', series, undefined)).toBe('host: host1');
  });

  it('replaces missing placeholder with empty string', () => {
    const series = makeSeries({}, []);
    expect(interpolateLabel('{{missing}}', series, undefined)).toBe('');
  });

  it('leaves template unchanged when no placeholders', () => {
    const series = makeSeries({}, []);
    expect(interpolateLabel('static text', series, undefined)).toBe('static text');
  });

  it('does not expose {{value}} when last value is null', () => {
    const series = makeSeries({}, [[0, null]]);
    const result = interpolateLabel('{{value}}', series, undefined);
    expect(result).toBe('');
  });

  it('handles whitespace inside braces: {{ value }}', () => {
    const series = makeSeries({}, [[0, 10]]);
    const result = interpolateLabel('{{ value }}', series, undefined);
    expect(result).toContain('10');
  });
});

describe('colorFromThresholds', () => {
  const palette = ['#aaa', '#bbb', '#ccc'];
  const fallback = '#fff';

  it('returns defaultColor when no steps are defined', () => {
    expect(colorFromThresholds(50, { steps: [] }, palette, fallback)).toBe(palette[0]);
  });

  it('returns threshold defaultColor when set and no step matches', () => {
    expect(
      colorFromThresholds(1, { defaultColor: '#123', steps: [{ value: 10, color: '#abc' }] }, palette, fallback)
    ).toBe('#123');
  });

  it('returns step color when value meets the threshold', () => {
    const thresholds = { steps: [{ value: 10, color: '#f00' }] };
    expect(colorFromThresholds(10, thresholds, palette, fallback)).toBe('#f00');
  });

  it('returns the highest matched step color', () => {
    const thresholds = {
      steps: [
        { value: 10, color: '#f00' },
        { value: 50, color: '#0f0' },
        { value: 100, color: '#00f' },
      ],
    };
    expect(colorFromThresholds(75, thresholds, palette, fallback)).toBe('#0f0');
  });

  it('falls back to palette color when step has no color', () => {
    const thresholds = { steps: [{ value: 0 }] };
    expect(colorFromThresholds(5, thresholds, palette, fallback)).toBe(palette[0]);
  });

  it('returns fallback when palette is empty and step has no color', () => {
    const thresholds = { steps: [{ value: 0 }] };
    expect(colorFromThresholds(5, thresholds, [], fallback)).toBe(fallback);
  });
});

describe('isSafeImageUrl', () => {
  it('allows https URLs', () => {
    expect(isSafeImageUrl('https://example.com/image.png')).toBe(true);
  });

  it('rejects http URLs', () => {
    expect(isSafeImageUrl('http://example.com/image.png')).toBe(false);
  });

  it('rejects javascript URLs', () => {
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects blob URLs', () => {
    expect(isSafeImageUrl('blob:https://example.com/abc')).toBe(false);
  });

  it('rejects plain strings that are not URLs', () => {
    expect(isSafeImageUrl('not-a-url')).toBe(false);
  });

  it('allows data:image/png', () => {
    expect(isSafeImageUrl('data:image/png;base64,abc123')).toBe(true);
  });

  it('allows data:image/jpeg', () => {
    expect(isSafeImageUrl('data:image/jpeg;base64,abc123')).toBe(true);
  });

  it('allows data:image/gif', () => {
    expect(isSafeImageUrl('data:image/gif;base64,abc123')).toBe(true);
  });

  it('allows data:image/webp', () => {
    expect(isSafeImageUrl('data:image/webp;base64,abc123')).toBe(true);
  });

  it('allows data:image/avif', () => {
    expect(isSafeImageUrl('data:image/avif;base64,abc123')).toBe(true);
  });

  it('rejects data:image/svg+xml', () => {
    expect(isSafeImageUrl('data:image/svg+xml;base64,abc123')).toBe(false);
  });

  it('rejects data:text/html', () => {
    expect(isSafeImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });
});
