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

import type { DurationString } from '@perses-dev/spec';

import { PyroscopeDatasource } from './pyroscope-datasource';

const CLIENT_OPTIONS = { proxyUrl: 'http://proxy.example.com' };

function minStepSecondsFor(minStep?: DurationString): number | undefined {
  return PyroscopeDatasource.createClient({ directUrl: 'http://pyroscope.example.com:4040', minStep }, CLIENT_OPTIONS)
    .options.minStepSeconds;
}

describe('PyroscopeDatasource createClient', () => {
  it('throws when neither a direct URL nor a proxy URL is available', () => {
    expect(() => PyroscopeDatasource.createClient({}, {})).toThrow('No URL specified for Pyroscope client');
  });

  it('falls back to the 15s default when minStep is not configured', () => {
    expect(minStepSecondsFor(undefined)).toBe(15);
  });

  it('converts a whole-second minStep as-is', () => {
    expect(minStepSecondsFor('30s')).toBe(30);
    expect(minStepSecondsFor('1m')).toBe(60);
  });

  // The duration syntax accepts an `ms` component, so minStep can carry sub-second precision that
  // the SelectSeries API (whole seconds) cannot express. Rounding down broke that in two ways:
  // it lowered the floor below what was configured, and anything under 1s collapsed to 0 - which
  // then flowed into transformTimeline as a zero step and threw `Invalid array length`.
  it('rounds a sub-second minStep up to a usable whole second (regression: PR #810 review)', () => {
    expect(minStepSecondsFor('500ms')).toBe(1);
    expect(minStepSecondsFor('999ms')).toBe(1);
  });

  it('rounds a fractional minStep up so it stays a true lower bound', () => {
    expect(minStepSecondsFor('1500ms')).toBe(2);
    expect(minStepSecondsFor('1s500ms')).toBe(2);
  });
});
