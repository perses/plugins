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

import {
  MOCK_PROFILE_TYPES_RESPONSE,
  MOCK_LABEL_NAMES_RESPONSE,
  MOCK_LABEL_VALUES_RESPONSE_NAME_REGION,
} from '../test';
import { searchProfileTypes, searchLabelNames, searchLabelValues } from './pyroscope-client';

const fetchMock = (global.fetch = jest.fn());

describe('pyroscope-client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('should return query results containing profilte types', async () => {
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve(MOCK_PROFILE_TYPES_RESPONSE) });

    const results = await searchProfileTypes({}, { datasourceUrl: '' }, {});
    expect(results).toEqual(MOCK_PROFILE_TYPES_RESPONSE);
  });

  it('should return query results containing label names', async () => {
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve(MOCK_LABEL_NAMES_RESPONSE) });

    const results = await searchLabelNames({}, { datasourceUrl: '' }, {});
    expect(results).toEqual(MOCK_LABEL_NAMES_RESPONSE);
  });

  it('should return query results containing label values', async () => {
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve(MOCK_LABEL_VALUES_RESPONSE_NAME_REGION) });

    const results = await searchLabelValues({}, { datasourceUrl: '' }, { name: 'region' });
    expect(results).toEqual(MOCK_LABEL_VALUES_RESPONSE_NAME_REGION);
  });
});
