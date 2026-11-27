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

import { interpolateVariables } from './interpolation';

describe('interpolateVariables', () => {
  it('quotes the values of the sqlstring format as ClickHouse string literals', () => {
    const variableState = {
      one: { value: "it's", loading: false },
      many: { value: ['a', 'b\\'], loading: false },
    };

    expect(interpolateVariables('x = ${one:sqlstring} AND y IN (${many:sqlstring})', variableState)).toBe(
      "x = 'it\\'s' AND y IN ('a','b\\\\')",
    );
  });

  it('keeps IN valid when nothing is selected', () => {
    expect(interpolateVariables('y IN (${many:sqlstring})', { many: { value: [], loading: false } })).toBe(
      'y IN (NULL)',
    );
  });

  it('does not interpolate the value of a variable again', () => {
    const variableState = {
      a: { value: '$b', loading: false },
      b: { value: 'injected', loading: false },
    };

    expect(interpolateVariables('SELECT ${a:sqlstring}, $b', variableState)).toBe("SELECT '$b', injected");
  });

  it('leaves the other formats to Perses and unknown variables as they are', () => {
    const variableState = { table: { value: 'otel_logs', loading: false } };

    expect(interpolateVariables('SELECT * FROM $table WHERE x = ${unknown:sqlstring}', variableState)).toBe(
      'SELECT * FROM otel_logs WHERE x = ${unknown:sqlstring}',
    );
  });

  it('leaves the variables of the comments alone, so that a value can not end a comment', () => {
    const variableState = { service: { value: 'x\nDROP TABLE t */ OR 1', loading: false } };
    const sql = 'SELECT 1 -- AND s = ${service:sqlstring}\n/* $service */ WHERE s = ${service:sqlstring}';

    expect(interpolateVariables(sql, variableState)).toBe(
      "SELECT 1 -- AND s = ${service:sqlstring}\n/* $service */ WHERE s = 'x\nDROP TABLE t */ OR 1'",
    );
  });
});
