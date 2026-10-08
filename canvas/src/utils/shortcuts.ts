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
  const p = (navigator.platform || navigator.userAgent).toLowerCase();
  return p.includes('mac');
}

export const MOD_KEY = detectMac() ? '⌘' : 'Ctrl';

export interface ShortcutTooltip {
  keys: readonly string[];
  action: string;
}

export interface MouseShortcutDefinition {
  mouseEvent: 'wheel' | 'mousedown' | 'dblclick';
  modifierKey?: boolean;
  mouseButton?: number;
}

const MOUSE_SHORTCUT_IDS = ['zoom', 'pan', 'resetView', 'fitView'] as const;
const KEYBOARD_SHORTCUT_IDS = ['deleteSelected'] as const;

export type MouseShortcutId = (typeof MOUSE_SHORTCUT_IDS)[number];
export type KeyboardShortcutId = (typeof KEYBOARD_SHORTCUT_IDS)[number];

export interface MouseShortcut {
  id: MouseShortcutId;
  tooltip: ShortcutTooltip;
  definition: MouseShortcutDefinition;
}

export interface KeyboardShortcutDefinition {
  keys: readonly string[];
}

export interface KeyboardShortcut {
  id: KeyboardShortcutId;
  tooltip: ShortcutTooltip;
  definition: KeyboardShortcutDefinition;
}

export const VIEW_SHORTCUTS: ReadonlyArray<MouseShortcut | KeyboardShortcut> = [
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

export const EDITOR_SHORTCUTS: ReadonlyArray<MouseShortcut | KeyboardShortcut> = [
  ...VIEW_SHORTCUTS,
  {
    id: 'deleteSelected',
    tooltip: { keys: ['Delete', 'Backspace'], action: 'Delete selected' },
    definition: { keys: ['Delete', 'Backspace'] },
  },
];

const MOUSE_SHORTCUTS: readonly MouseShortcut[] = VIEW_SHORTCUTS.filter(
  (s): s is MouseShortcut => MOUSE_SHORTCUT_IDS.includes(s.id as MouseShortcutId),
);

const KEYBOARD_SHORTCUTS: readonly KeyboardShortcut[] = EDITOR_SHORTCUTS.filter(
  (s): s is KeyboardShortcut => KEYBOARD_SHORTCUT_IDS.includes(s.id as KeyboardShortcutId),
);

type ResolveEvent = {
  type: string;
  ctrlKey: boolean;
  metaKey: boolean;
  button?: number;
};

export function resolveMouseShortcut(event: ResolveEvent): MouseShortcut | null {
  const modifierKey = event.ctrlKey || event.metaKey;
  return (
    MOUSE_SHORTCUTS.find((s) => {
      const definition = s.definition;
      return (
        definition.mouseEvent === event.type &&
        (definition.modifierKey === undefined || definition.modifierKey === modifierKey) &&
        (definition.mouseButton === undefined || definition.mouseButton === event.button)
      );
    }) ?? null
  );
}

export function resolveKeyboardShortcut(key: string): KeyboardShortcut | null {
  return KEYBOARD_SHORTCUTS.find((s) => s.definition.keys.includes(key)) ?? null;
}
