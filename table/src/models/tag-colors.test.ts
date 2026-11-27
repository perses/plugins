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

import type { CellSettings, TagsColorMode } from './table-model';
import {
  DEFAULT_MANUAL_TAG_COLOR,
  getPaletteColor,
  hashStringToColor,
  normalizeHexColor,
  resolveTags,
  splitTagValues,
} from './tag-colors';

describe('hashStringToColor', () => {
  it('is stable and hsl with hue >= 20', () => {
    expect(hashStringToColor('prod')).toBe(hashStringToColor('prod'));
    // Same output as the AlertTable label colors (alertmanager plugin) it is ported from
    expect(hashStringToColor('prod')).toBe('hsl(116, 61%, 51%)');
    const [, hue] = hashStringToColor('prod').match(/^hsl\((\d+), \d+%, \d+%\)$/)!;
    expect(Number(hue)).toBeGreaterThanOrEqual(20);
  });
});

describe('normalizeHexColor', () => {
  it('keeps valid hex colors and adds the missing #', () => {
    expect(normalizeHexColor('#ff0000')).toBe('#ff0000');
    expect(normalizeHexColor('ff0000')).toBe('#ff0000');
    expect(normalizeHexColor('FFF')).toBe('#FFF');
  });

  it('rejects values that are not 3 or 6 digit hex colors', () => {
    expect(normalizeHexColor('red')).toBeUndefined();
    expect(normalizeHexColor('')).toBeUndefined();
    expect(normalizeHexColor('#ff0000aa')).toBeUndefined();
  });
});

describe('splitTagValues', () => {
  it('returns [] for null, undefined and empty string', () => {
    expect(splitTagValues(null, ',')).toEqual([]);
    expect(splitTagValues(undefined)).toEqual([]);
    expect(splitTagValues('', ',')).toEqual([]);
  });

  it('returns the raw value when no delimiter', () => {
    expect(splitTagValues('a,b')).toEqual(['a,b']);
    expect(splitTagValues(42)).toEqual([42]);
  });

  it('splits, trims and drops empty parts, keeping order and duplicates', () => {
    expect(splitTagValues(' prod, eu ,,prod', ',')).toEqual(['prod', 'eu', 'prod']);
  });

  it('splitTagValues returns [] when all parts are empty', () => {
    expect(splitTagValues(',, ,', ',')).toEqual([]);
  });
});

describe('resolveTags', () => {
  const critical: CellSettings = {
    condition: { kind: 'Value', spec: { value: 'critical' } },
    backgroundColor: '#d32f2f',
  };
  const globalCrit: CellSettings = {
    condition: { kind: 'Value', spec: { value: 'critical' } },
    backgroundColor: '#000000',
  };

  it('column rule wins over global rule', () => {
    expect(resolveTags('critical', { name: 'c', tags: {}, cellSettings: [critical] }, [globalCrit])).toEqual([
      { label: 'critical', backgroundColor: '#d32f2f', textColor: undefined },
    ]);
  });

  it('global rule applies when no column rule matches', () => {
    expect(resolveTags('critical', { name: 'c', tags: {} }, [globalCrit])[0]!.backgroundColor).toBe('#000000');
  });

  it('defaultColor applies to unmatched tags', () => {
    expect(
      resolveTags(
        'a,critical',
        { name: 'c', tags: { delimiter: ',', colorMode: 'manual', defaultColor: '#9e9e9e' }, cellSettings: [critical] },
        [],
      ),
    ).toEqual([
      { label: 'a', backgroundColor: '#9e9e9e', textColor: undefined },
      { label: 'critical', backgroundColor: '#d32f2f', textColor: undefined },
    ]);
  });

  it('auto color applies when nothing else does', () => {
    expect(resolveTags('eu', { name: 'c', tags: {} }, [])[0]!.backgroundColor).toBe(hashStringToColor('eu'));
  });

  it('rule with only textColor falls through to defaultColor for background', () => {
    const rule: CellSettings = { condition: { kind: 'Value', spec: { value: 'x' } }, textColor: '#ffffff' };
    expect(
      resolveTags('x', { name: 'c', tags: { colorMode: 'manual', defaultColor: '#123456' }, cellSettings: [rule] }, []),
    ).toEqual([{ label: 'x', backgroundColor: '#123456', textColor: '#ffffff' }]);
  });

  it('applies rule text, prefix and suffix to the label', () => {
    const rule: CellSettings = {
      condition: { kind: 'Regex', spec: { expr: '^prod' } },
      text: 'PROD',
      prefix: '[',
      suffix: ']',
    };
    expect(resolveTags('prod-eu', { name: 'c', tags: {}, cellSettings: [rule] }, [])[0]!.label).toBe('[PROD]');
  });

  it('evaluates Range rules on numeric parts', () => {
    const rule: CellSettings = { condition: { kind: 'Range', spec: { min: 10 } }, backgroundColor: '#ff0000' };
    expect(
      resolveTags('5,15', { name: 'c', tags: { delimiter: ',' }, cellSettings: [rule] }, []).map(
        (t) => t.backgroundColor,
      ),
    ).toEqual([hashStringToColor('5'), '#ff0000']);
  });

  it('returns one tag for null only when a rule matches', () => {
    const nullRule: CellSettings = {
      condition: { kind: 'Misc', spec: { value: 'null' } },
      text: 'N/A',
      backgroundColor: '#eeeeee',
    };
    expect(resolveTags(null, { name: 'c', tags: {}, cellSettings: [nullRule] }, [])).toEqual([
      { label: 'N/A', backgroundColor: '#eeeeee', textColor: undefined },
    ]);
    expect(resolveTags(null, { name: 'c', tags: {} }, [])).toEqual([]);
  });

  it('resolveTags formats numbers only without delimiter', () => {
    expect(resolveTags(0.5, { name: 'c', tags: {}, format: { unit: 'percent-decimal' } }, [])[0]!.label).toBe('50%');
    expect(
      resolveTags(42, { name: 'c', tags: { delimiter: ',' }, format: { unit: 'percent-decimal' } }, [])[0]!.label,
    ).toBe('42');
  });

  it('resolveTags ignores invalid regex rules', () => {
    const bad: CellSettings = { condition: { kind: 'Regex', spec: { expr: '[' } }, backgroundColor: '#ff0000' };
    expect(
      resolveTags(
        'a',
        { name: 'c', tags: { colorMode: 'manual', defaultColor: '#9e9e9e' }, cellSettings: [bad] },
        [],
      )[0]!.backgroundColor,
    ).toBe('#9e9e9e');
  });

  it('resolveTags matches Misc true on raw boolean', () => {
    const rule: CellSettings = {
      condition: { kind: 'Misc', spec: { value: 'true' } },
      text: 'yes',
      backgroundColor: '#00ff00',
    };
    expect(resolveTags(true, { name: 'c', tags: {}, cellSettings: [rule] }, [])).toEqual([
      { label: 'yes', backgroundColor: '#00ff00', textColor: undefined },
    ]);
  });
});

describe('getPaletteColor', () => {
  const palette = ['#111111', '#222222', '#333333'];

  it('is stable and picks a color of the palette', () => {
    expect(getPaletteColor('prod', palette)).toBe(getPaletteColor('prod', palette));
    expect(palette).toContain(getPaletteColor('prod', palette));
  });

  it('spreads values across the palette', () => {
    const colors = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((v) => getPaletteColor(v, palette)));
    expect(colors.size).toBeGreaterThan(1);
  });

  it('returns undefined for an empty palette', () => {
    expect(getPaletteColor('prod', [])).toBeUndefined();
  });
});

describe('resolveTags color modes', () => {
  const palette = ['#111111', '#222222', '#333333'];
  const rule: CellSettings = { condition: { kind: 'Value', spec: { value: 'critical' } }, backgroundColor: '#d32f2f' };
  const bg = (colorMode: TagsColorMode | undefined, value: string, defaultColor?: `#${string}`): string =>
    resolveTags(value, { name: 'c', tags: { colorMode, defaultColor }, cellSettings: [rule] }, [], palette)[0]!
      .backgroundColor;

  it('auto is the default and uses the value hash', () => {
    expect(bg(undefined, 'eu')).toBe(hashStringToColor('eu'));
    expect(bg('auto', 'eu')).toBe(hashStringToColor('eu'));
  });

  it('palette uses the theme palette', () => {
    expect(bg('palette', 'eu')).toBe(getPaletteColor('eu', palette));
  });

  it('palette falls back to the value hash when the palette is empty', () => {
    expect(resolveTags('eu', { name: 'c', tags: { colorMode: 'palette' } }, [], [])[0]!.backgroundColor).toBe(
      hashStringToColor('eu'),
    );
  });

  it('manual uses defaultColor, or the default manual color when unset', () => {
    expect(bg('manual', 'eu', '#123456')).toBe('#123456');
    expect(bg('manual', 'eu')).toBe(DEFAULT_MANUAL_TAG_COLOR);
    expect(DEFAULT_MANUAL_TAG_COLOR).toBe('#9e9e9e');
  });

  it('ignores defaultColor when the color mode is not manual', () => {
    expect(bg(undefined, 'eu', '#123456')).toBe(hashStringToColor('eu'));
    expect(bg('palette', 'eu', '#123456')).toBe(getPaletteColor('eu', palette));
  });

  it('a rule background wins in every color mode', () => {
    for (const mode of ['auto', 'palette', 'manual'] as const) {
      expect(bg(mode, 'critical', '#123456')).toBe('#d32f2f');
    }
  });
});
