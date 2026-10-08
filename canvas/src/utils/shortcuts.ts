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

function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const p = (navigator.platform ?? navigator.userAgent).toLowerCase();
  return p.includes('mac');
}

export const MOD_KEY = detectMac() ? '⌘' : 'Ctrl';

export interface MouseShortcutTooltip {
  keys: readonly string[];
  action: string;
}

export interface MouseShortcutDefinition {
  mouseEvent: string;
  modifierKey?: boolean;
  mouseButton?: number;
}

export type MouseShortcutId = 'zoom' | 'pan' | 'resetView' | 'fitView';

export interface MouseShortcut {
  id: MouseShortcutId;
  tooltip: MouseShortcutTooltip;
  definition: MouseShortcutDefinition;
}

export const SHORTCUTS: MouseShortcut[] = [
  {
    id: 'zoom',
    tooltip: { keys: [MOD_KEY, 'Scroll'], action: 'Zoom in / out' },
    definition: { mouseEvent: 'wheel', modifierKey: true },
  },
  {
    id: 'pan',
    tooltip: { keys: ['Middle mouse', 'Drag'], action: 'Pan' },
    definition: { mouseEvent: 'mousedown', mouseButton: 1 },
  },
  {
    id: 'resetView',
    tooltip: { keys: ['Double-click'], action: 'Reset pan & zoom' },
    definition: { mouseEvent: 'dblclick', modifierKey: false },
  },
  {
    id: 'fitView',
    tooltip: { keys: [MOD_KEY, 'Double-click'], action: 'Fit all nodes in view' },
    definition: { mouseEvent: 'dblclick', modifierKey: true },
  },
];

type ResolveEvent = {
  type: string;
  ctrlKey: boolean;
  metaKey: boolean;
  button?: number;
};

export function resolveMouseShortcut(event: ResolveEvent): MouseShortcut | null {
  const modifierKey = event.ctrlKey || event.metaKey;
  return (
    SHORTCUTS.find((s) => {
      const definition = s.definition;
      return (
        definition.mouseEvent === event.type &&
        (definition.modifierKey === undefined || definition.modifierKey === modifierKey) &&
        (definition.mouseButton === undefined || definition.mouseButton === event.button)
      );
    }) ?? null
  );
}
