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

import { resolveKeyboardShortcut, resolveMouseShortcut } from './shortcuts';

describe('resolveMouseShortcut', () => {
  it('returns zoom on wheel + ctrlKey (trackpad pinch-to-zoom)', () => {
    expect(resolveMouseShortcut({ type: 'wheel', ctrlKey: true, metaKey: false })?.id).toBe('zoom');
  });

  it('returns zoom on wheel + metaKey (Cmd+scroll on Mac)', () => {
    expect(resolveMouseShortcut({ type: 'wheel', ctrlKey: false, metaKey: true })?.id).toBe('zoom');
  });

  it('returns null on wheel without modifier', () => {
    expect(resolveMouseShortcut({ type: 'wheel', ctrlKey: false, metaKey: false })).toBeNull();
  });

  it('returns pan on middle-click regardless of modifier', () => {
    expect(resolveMouseShortcut({ type: 'mousedown', ctrlKey: false, metaKey: false, button: 1 })?.id).toBe('pan');
    expect(resolveMouseShortcut({ type: 'mousedown', ctrlKey: true, metaKey: false, button: 1 })?.id).toBe('pan');
  });

  it('returns null on left-click', () => {
    expect(resolveMouseShortcut({ type: 'mousedown', ctrlKey: false, metaKey: false, button: 0 })).toBeNull();
  });

  it('returns null on right-click', () => {
    expect(resolveMouseShortcut({ type: 'mousedown', ctrlKey: false, metaKey: false, button: 2 })).toBeNull();
  });

  it('returns resetView on dblclick (no modifier)', () => {
    expect(resolveMouseShortcut({ type: 'dblclick', ctrlKey: false, metaKey: false })?.id).toBe('resetView');
  });

  it('returns fitView on dblclick + ctrlKey', () => {
    expect(resolveMouseShortcut({ type: 'dblclick', ctrlKey: true, metaKey: false })?.id).toBe('fitView');
  });

  it('returns fitView on dblclick + metaKey', () => {
    expect(resolveMouseShortcut({ type: 'dblclick', ctrlKey: false, metaKey: true })?.id).toBe('fitView');
  });

  it('returns null for unrecognized event type', () => {
    expect(resolveMouseShortcut({ type: 'mousemove', ctrlKey: false, metaKey: false })).toBeNull();
  });
});

describe('resolveKeyboardShortcut', () => {
  it('returns deleteSelected on Delete', () => {
    expect(resolveKeyboardShortcut('Delete')?.id).toBe('deleteSelected');
  });

  it('returns deleteSelected on Backspace', () => {
    expect(resolveKeyboardShortcut('Backspace')?.id).toBe('deleteSelected');
  });

  it('returns null for unrecognized key', () => {
    expect(resolveKeyboardShortcut('Escape')).toBeNull();
  });
});
