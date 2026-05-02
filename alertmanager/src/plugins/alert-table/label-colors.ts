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

import { LabelColorMapping } from './alert-table-model';

const SEVERITY_LEVEL_COLORS: Record<string, string> = {
  critical: '#d32f2f',
  error: '#ef6c00',
  warning: '#f9a825',
  info: '#0288d1',
  debug: '#7b1fa2',
  trace: '#6a1b9a',
  unknown: '#757575',
  other: '#9e9e9e',
};

const SEVERITY_ABBREVIATIONS: Record<string, string[]> = {
  critical: ['critical', 'crit', 'fatal', 'emerg', 'alert', 'page'],
  error: ['error', 'err', 'eror', 'high', 'severe'],
  warning: ['warning', 'warn', 'medium'],
  info: ['info', 'inf', 'information', 'informational', 'notice', 'low'],
  debug: ['debug', 'dbug'],
  trace: ['trace'],
  unknown: ['unknown'],
  other: ['other', 'none', 'minor', ''],
};

const SEVERITY_COLORS: Record<string, string> = {};
for (const [level, abbrevs] of Object.entries(SEVERITY_ABBREVIATIONS)) {
  const color = SEVERITY_LEVEL_COLORS[level]!;
  for (const abbrev of abbrevs) {
    SEVERITY_COLORS[abbrev] = color;
  }
}

export const SEVERITY_ORDER: string[] = ['critical', 'error', 'warning', 'info', 'debug', 'trace', 'unknown', 'other'];

export function getSeverityWeight(value: string): number {
  const normalized = value.toLowerCase();
  for (const [level, abbrevs] of Object.entries(SEVERITY_ABBREVIATIONS)) {
    if (abbrevs.includes(normalized)) {
      const idx = SEVERITY_ORDER.indexOf(level);
      return idx === -1 ? SEVERITY_ORDER.length : idx;
    }
  }
  return SEVERITY_ORDER.length;
}

const MANUAL_FALLBACK = '#9e9e9e';
const ERROR_HUE_CUTOFF = 20;

export function hashStringToColor(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  hash = Math.abs(hash);

  const hue = ERROR_HUE_CUTOFF + (hash % (360 - ERROR_HUE_CUTOFF));
  const saturation = 55 + (hash % 25);
  const lightness = 45 + (hash % 15);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

const MAX_REGEX_CACHE_SIZE = 1000;
const regexCache = new Map<string, RegExp | null>();

function getCompiledRegex(pattern: string): RegExp | null {
  if (regexCache.has(pattern)) return regexCache.get(pattern)!;
  if (regexCache.size >= MAX_REGEX_CACHE_SIZE) regexCache.clear();
  try {
    const re = new RegExp(pattern);
    regexCache.set(pattern, re);
    return re;
  } catch {
    regexCache.set(pattern, null);
    return null;
  }
}

function matchesOverride(labelValue: string, pattern: string, isRegex: boolean): boolean {
  if (isRegex) {
    const re = getCompiledRegex(pattern);
    return re !== null && re.test(labelValue);
  }
  return labelValue === pattern;
}

export function getLabelColor(value: string, mapping: LabelColorMapping): string {
  if (mapping.overrides) {
    for (const override of mapping.overrides) {
      if (matchesOverride(value, override.value, override.isRegex)) {
        return override.color;
      }
    }
  }

  switch (mapping.mode) {
    case 'severity':
      return SEVERITY_COLORS[value.toLowerCase()] ?? hashStringToColor(value);
    case 'auto':
      return hashStringToColor(value);
    case 'manual':
      return MANUAL_FALLBACK;
  }
}
