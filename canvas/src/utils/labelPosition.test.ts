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

import { labelAttrs } from './labelPosition';

describe('labelAttrs', () => {
  const halfW = 50;
  const halfH = 30;

  it('defaults to below when position is undefined', () => {
    const attrs = labelAttrs(halfW, halfH, undefined, undefined);
    expect(attrs.x).toBe(0);
    expect(attrs.y).toBe(30 + 12);
    expect(attrs.textAnchor).toBe('middle');
    expect(attrs.dominantBaseline).toBe('hanging');
  });

  it('above: places label above with default padding', () => {
    const attrs = labelAttrs(halfW, halfH, 'above', undefined);
    expect(attrs.x).toBe(0);
    expect(attrs.y).toBe(-(30 + 12));
    expect(attrs.textAnchor).toBe('middle');
    expect(attrs.dominantBaseline).toBe('auto');
  });

  it('below: places label below with custom padding', () => {
    const attrs = labelAttrs(halfW, halfH, 'below', 20);
    expect(attrs.y).toBe(30 + 20);
  });

  it('left: places label to the left', () => {
    const attrs = labelAttrs(halfW, halfH, 'left', undefined);
    expect(attrs.x).toBe(-(50 + 12));
    expect(attrs.y).toBe(0);
    expect(attrs.textAnchor).toBe('end');
    expect(attrs.dominantBaseline).toBe('middle');
  });

  it('right: places label to the right', () => {
    const attrs = labelAttrs(halfW, halfH, 'right', undefined);
    expect(attrs.x).toBe(50 + 12);
    expect(attrs.y).toBe(0);
    expect(attrs.textAnchor).toBe('start');
    expect(attrs.dominantBaseline).toBe('middle');
  });

  it('center: places label at origin', () => {
    const attrs = labelAttrs(halfW, halfH, 'center', undefined);
    expect(attrs.x).toBe(0);
    expect(attrs.y).toBe(0);
    expect(attrs.textAnchor).toBe('middle');
    expect(attrs.dominantBaseline).toBe('middle');
  });

  it('respects explicit padding of 0', () => {
    const attrs = labelAttrs(halfW, halfH, 'below', 0);
    expect(attrs.y).toBe(30);
  });
});
