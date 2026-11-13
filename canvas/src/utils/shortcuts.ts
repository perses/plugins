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
  /** Accepted mouse button(s). Omit to match any button. */
  mouseButtons?: readonly number[];
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

const ZOOM_SHORTCUT: MouseShortcut = {
  id: 'zoom',
  tooltip: { keys: [MOD_KEY, 'Scroll'], action: 'Zoom in / out' },
  definition: { mouseEvent: 'wheel', modifierKey: true },
};

const RESET_VIEW_SHORTCUT: MouseShortcut = {
  id: 'resetView',
  tooltip: { keys: ['Double-click'], action: 'Reset pan & zoom' },
  definition: { mouseEvent: 'dblclick', modifierKey: false },
};

const FIT_VIEW_SHORTCUT: MouseShortcut = {
  id: 'fitView',
  tooltip: { keys: [MOD_KEY, 'Double-click'], action: 'Fit all nodes in view' },
  definition: { mouseEvent: 'dblclick', modifierKey: true },
};

// The read-only display panel has no editing gestures competing for the left button, so it pans with
// either the left or the middle button (plus the on-screen controls). The editor keeps pan on the
// middle button only, leaving the left button free for node move, edge drag and rubber-band select.
const VIEW_PAN_SHORTCUT: MouseShortcut = {
  id: 'pan',
  tooltip: { keys: ['Left / Middle mouse', 'Drag'], action: 'Pan' },
  definition: { mouseEvent: 'mousedown', mouseButtons: [0, 1] },
};

const EDITOR_PAN_SHORTCUT: MouseShortcut = {
  id: 'pan',
  tooltip: { keys: ['Middle mouse', 'Drag'], action: 'Pan' },
  definition: { mouseEvent: 'mousedown', mouseButtons: [1] },
};

export const VIEW_SHORTCUTS: ReadonlyArray<MouseShortcut | KeyboardShortcut> = [
  ZOOM_SHORTCUT,
  VIEW_PAN_SHORTCUT,
  RESET_VIEW_SHORTCUT,
  FIT_VIEW_SHORTCUT,
];

export const EDITOR_SHORTCUTS: ReadonlyArray<MouseShortcut | KeyboardShortcut> = [
  ZOOM_SHORTCUT,
  EDITOR_PAN_SHORTCUT,
  RESET_VIEW_SHORTCUT,
  FIT_VIEW_SHORTCUT,
  {
    id: 'deleteSelected',
    tooltip: { keys: ['Delete', 'Backspace'], action: 'Delete selected' },
    definition: { keys: ['Delete', 'Backspace'] },
  },
];

function mouseShortcutsFor(shortcuts: ReadonlyArray<MouseShortcut | KeyboardShortcut>): readonly MouseShortcut[] {
  return shortcuts.filter((s): s is MouseShortcut => MOUSE_SHORTCUT_IDS.includes(s.id as MouseShortcutId));
}

const VIEW_MOUSE_SHORTCUTS = mouseShortcutsFor(VIEW_SHORTCUTS);
const EDITOR_MOUSE_SHORTCUTS = mouseShortcutsFor(EDITOR_SHORTCUTS);

const KEYBOARD_SHORTCUTS: readonly KeyboardShortcut[] = EDITOR_SHORTCUTS.filter((s): s is KeyboardShortcut =>
  KEYBOARD_SHORTCUT_IDS.includes(s.id as KeyboardShortcutId),
);

type ResolveEvent = {
  type: string;
  ctrlKey: boolean;
  metaKey: boolean;
  button?: number;
};

/**
 * Resolve a mouse event to the canvas shortcut it triggers, for the given interaction mode. The mode
 * matters because the view and editor panels bind pan to different buttons (see the pan shortcuts
 * above); defaults to `view` for the read-only display panel.
 */
export function resolveMouseShortcut(event: ResolveEvent, mode: 'view' | 'editor' = 'view'): MouseShortcut | null {
  const modifierKey = event.ctrlKey || event.metaKey;
  const shortcuts = mode === 'editor' ? EDITOR_MOUSE_SHORTCUTS : VIEW_MOUSE_SHORTCUTS;
  return (
    shortcuts.find((s) => {
      const definition = s.definition;
      return (
        definition.mouseEvent === event.type &&
        (definition.modifierKey === undefined || definition.modifierKey === modifierKey) &&
        (definition.mouseButtons === undefined ||
          (event.button !== undefined && definition.mouseButtons.includes(event.button)))
      );
    }) ?? null
  );
}

export function resolveKeyboardShortcut(key: string): KeyboardShortcut | null {
  return KEYBOARD_SHORTCUTS.find((s) => s.definition.keys.includes(key)) ?? null;
}
