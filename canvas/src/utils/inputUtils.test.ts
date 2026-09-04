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

import { parseNumberInput } from './inputUtils';

describe('parseNumberInput', () => {
  describe('valid number', () => {
    it('returns the parsed value', () => {
      expect(parseNumberInput('42', undefined)).toBe(42);
    });

    it('returns a negative value when no min is set', () => {
      expect(parseNumberInput('-10', 0)).toBe(-10);
    });

    it('returns a float value', () => {
      expect(parseNumberInput('3.5', 0)).toBe(3.5);
    });
  });

  describe('min constraint', () => {
    it('returns the value when equal to min', () => {
      expect(parseNumberInput('8', undefined, { min: 8 })).toBe(8);
    });

    it('returns the value when above min', () => {
      expect(parseNumberInput('10', undefined, { min: 8 })).toBe(10);
    });

    it('falls back to currentValue when below min', () => {
      expect(parseNumberInput('3', 8, { min: 8 })).toBe(8);
    });
  });

  describe('invalid input', () => {
    it('falls back to currentValue for non-numeric string', () => {
      expect(parseNumberInput('abc', 5)).toBe(5);
    });

    it('falls back to currentValue for empty string without optional', () => {
      expect(parseNumberInput('', 5)).toBe(5);
    });

    it('falls back to undefined currentValue for non-numeric string', () => {
      expect(parseNumberInput('abc', undefined)).toBeUndefined();
    });
  });

  describe('optional flag', () => {
    it('returns undefined for empty string when optional', () => {
      expect(parseNumberInput('', 5, { optional: true })).toBeUndefined();
    });

    it('still returns parsed value for valid number when optional', () => {
      expect(parseNumberInput('7', 5, { optional: true })).toBe(7);
    });

    it('falls back to currentValue for non-numeric non-empty string when optional', () => {
      expect(parseNumberInput('abc', 5, { optional: true })).toBe(5);
    });
  });
});
