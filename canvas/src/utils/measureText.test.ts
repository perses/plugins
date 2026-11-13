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

import { measureTextWidth } from './measureText';

describe('measureTextWidth', () => {
  const mockContext = {
    font: '',
    measureText: vi.fn().mockReturnValue({ width: 42 }),
  };

  beforeEach(() => {
    document.createElement = vi.fn().mockReturnValue({
      getContext: vi.fn().mockReturnValue(mockContext),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets the font string from the supplied arguments', () => {
    measureTextWidth('hello', 700, 14, 'monospace');
    expect(mockContext.font).toBe('700 14px monospace');
  });

  it('calls measureText with the supplied text', () => {
    measureTextWidth('hello', 400, 11, 'sans-serif');
    expect(mockContext.measureText).toHaveBeenCalledWith('hello');
  });

  it('updates the font between calls', () => {
    measureTextWidth('a', 400, 11, 'sans-serif');
    measureTextWidth('b', 700, 14, 'monospace');
    expect(mockContext.font).toBe('700 14px monospace');
  });
});

describe('measureTextWidth — canvas unavailable', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('falls back to text.length * 6 when getContext returns null', async () => {
    document.createElement = vi.fn().mockReturnValue({ getContext: vi.fn().mockReturnValue(null) });
    const { measureTextWidth: measure } = await import('./measureText');
    expect(measure('hello', 400, 11, 'sans-serif')).toBe(30); // 5 * 6
  });
});
