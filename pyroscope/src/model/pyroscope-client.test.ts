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

import {
  MOCK_PROFILE_TYPES_RESPONSE,
  MOCK_LABEL_NAMES_RESPONSE,
  MOCK_LABEL_VALUES_RESPONSE_NAME_REGION,
} from '../test';
import { searchProfileTypes, searchLabelNames, searchLabelValues, searchServices } from './pyroscope-client';

const fetchMock = (global.fetch = vi.fn());

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

  it('lists distinct services through the metadata-backed Series request', async () => {
    fetchMock.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          labelsSet: [
            {
              labels: [
                { name: '__profile_type__', value: 'cpu' },
                { name: 'service_name', value: 'web' },
              ],
            },
            {
              labels: [
                { name: 'service_name', value: 'api' },
                { name: '__profile_type__', value: 'cpu' },
              ],
            },
            {
              labels: [
                { name: 'service_name', value: 'web' },
                { name: '__profile_type__', value: 'memory' },
              ],
            },
            { labels: [{ name: '__profile_type__', value: 'cpu' }] },
          ],
        }),
    });

    const results = await searchServices({}, { datasourceUrl: '' }, { start: 1000, end: 2000 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/querier.v1.QuerierService/Series?',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ start: 1000, end: 2000, labelNames: ['service_name', '__profile_type__'] }),
      }),
    );
    expect(results).toEqual({ names: ['api', 'web'] });
  });

  it('returns an empty service list when the Series response has no label sets', async () => {
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve({}) });

    expect(await searchServices({}, { datasourceUrl: '' }, { start: 1000, end: 2000 })).toEqual({ names: [] });
  });
});
