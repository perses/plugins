// Copyright 2025 The Perses Authors
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

import { StackTrace } from '@perses-dev/core';
import { Sample } from '../components/FlameChart';
import { filterJson, recursionJson } from './data-transform';
import { getSpanColor } from './palette-gen';

// define the structuredClone function
global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

describe('filterJson', () => {
  const emptyJson: StackTrace = {} as StackTrace;
  const rootJson: StackTrace = {
    id: 1,
    name: 'total',
    level: 1,
    start: 0,
    end: 1000,
    total: 1000,
    self: 0,
    children: [],
  };
  const firstChildJson: StackTrace = {
    id: 2,
    name: 'first-child',
    level: 2,
    start: 0,
    end: 800,
    total: 800,
    self: 800,
    children: [],
  };
  const secondChildJson: StackTrace = {
    id: 3,
    name: 'second-child',
    level: 2,
    start: 800,
    end: 1000,
    total: 200,
    self: 200,
    children: [],
  };

  // json is empty
  it('should return an empty stacktrace when json is empty', () => {
    const output1 = filterJson(emptyJson);
    const output2 = filterJson(emptyJson, 3);
    expect(output1).toEqual(emptyJson);
    expect(output2).toEqual(emptyJson);
  });

  // id not provided
  it('should return the same stacktrace when id is not provided', () => {
    const output = filterJson(rootJson);
    expect(output).toEqual(rootJson);
  });

  // id provided
  it('should return the right stacktrace for a given stacktrace and id', () => {
    rootJson.children.push(firstChildJson, secondChildJson); // root function now has two children
    const output = filterJson(rootJson, 1);
    rootJson.children.pop();
    expect(output).toEqual(rootJson); // expected = rootJson with only the first child
  });

  it('should return the same stacktrace when the id not existed', () => {
    rootJson.children.push(firstChildJson, secondChildJson);
    const output = filterJson(rootJson, 5); // no function has this id
    expect(output).toEqual(rootJson);
  });
});

describe('recursionJson', () => {
  const emptyJson: StackTrace = {} as StackTrace;
  const rootJson: StackTrace = {
    id: 1,
    name: 'total',
    level: 1,
    start: 0,
    end: 1000,
    total: 1000,
    self: 0,
    children: [],
  };
  const firstChildJson: StackTrace = {
    id: 2,
    name: 'first-child',
    level: 2,
    start: 0,
    end: 800,
    total: 800,
    self: 800,
    children: [],
  };
  const secondChildJson: StackTrace = {
    id: 3,
    name: 'second-child',
    level: 2,
    start: 800,
    end: 1000,
    total: 200,
    self: 200,
    children: [],
  };
  const metadata = {
    spyName: '',
    sampleRate: 1000000000,
    units: 'samples',
    name: 'cpu',
  };
  const palette = 'package-name';

  it('should return an empty array when jsonObj is empty', () => {
    const output = recursionJson(palette, metadata, emptyJson);
    expect(output).toEqual([]);
  });

  it('should return the right array for a given jsonObj', () => {
    rootJson.children.push(firstChildJson, secondChildJson); // root function now has two children
    const output = recursionJson(palette, metadata, rootJson);
    const expected0: Sample = {
      name: 1,
      value: [1, 0, 1000, 'total (1.00K)', 100, 0, 'total', 0, 1000],
      itemStyle: {
        color: getSpanColor(palette, 'total', 100),
      },
    };
    const expected1: Sample = {
      name: 2,
      value: [2, 0, 800, 'first-child (800.00)', 80, 80, 'first-child', 800, 800],
      itemStyle: {
        color: getSpanColor(palette, 'first-child', 80),
      },
    };
    const expected2: Sample = {
      name: 3,
      value: [2, 800, 1000, 'second-child (200.00)', 20, 20, 'second-child', 200, 200],
      itemStyle: {
        color: getSpanColor(palette, 'second-child', 20),
      },
    };
    expect(output.length).toEqual(3); // root + 2 children
    expect(output[0]).toEqual(expected0);
    expect(output[1]).toEqual(expected1);
    expect(output[2]).toEqual(expected2);
  });
});
