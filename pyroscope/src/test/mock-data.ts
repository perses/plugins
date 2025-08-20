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

import { SearchProfileTypesResponse, SearchLabelNamesResponse, SearchLabelValuesResponse } from '../model/api-types';

export const MOCK_PROFILE_TYPES_RESPONSE: SearchProfileTypesResponse = {
  profileTypes: [
    {
      ID: 'block:contentions:count:contentions:count',
      name: 'block',
      sampleType: 'contentions',
      sampleUnit: 'count',
      periodType: 'contentions',
      periodUnit: 'count',
    },
    {
      ID: 'block:delay:nanoseconds:contentions:count',
      name: 'block',
      sampleType: 'delay',
      sampleUnit: 'nanoseconds',
      periodType: 'contentions',
      periodUnit: 'count',
    },
    {
      ID: 'goroutines:goroutine:count:goroutine:count',
      name: 'goroutines',
      sampleType: 'goroutine',
      sampleUnit: 'count',
      periodType: 'goroutine',
      periodUnit: 'count',
    },
    {
      ID: 'memory:alloc_objects:count:space:bytes',
      name: 'memory',
      sampleType: 'alloc_objects',
      sampleUnit: 'count',
      periodType: 'space',
      periodUnit: 'bytes',
    },
    {
      ID: 'memory:alloc_space:bytes:space:bytes',
      name: 'memory',
      sampleType: 'alloc_space',
      sampleUnit: 'bytes',
      periodType: 'space',
      periodUnit: 'bytes',
    },
    {
      ID: 'memory:inuse_objects:count:space:bytes',
      name: 'memory',
      sampleType: 'inuse_objects',
      sampleUnit: 'count',
      periodType: 'space',
      periodUnit: 'bytes',
    },
    {
      ID: 'memory:inuse_space:bytes:space:bytes',
      name: 'memory',
      sampleType: 'inuse_space',
      sampleUnit: 'bytes',
      periodType: 'space',
      periodUnit: 'bytes',
    },
    {
      ID: 'mutex:contentions:count:contentions:count',
      name: 'mutex',
      sampleType: 'contentions',
      sampleUnit: 'count',
      periodType: 'contentions',
      periodUnit: 'count',
    },
    {
      ID: 'mutex:delay:nanoseconds:contentions:count',
      name: 'mutex',
      sampleType: 'delay',
      sampleUnit: 'nanoseconds',
      periodType: 'contentions',
      periodUnit: 'count',
    },
    {
      ID: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds',
      name: 'process_cpu',
      sampleType: 'cpu',
      sampleUnit: 'nanoseconds',
      periodType: 'cpu',
      periodUnit: 'nanoseconds',
    },
    {
      ID: 'process_cpu:samples:count:cpu:nanoseconds',
      name: 'process_cpu',
      sampleType: 'samples',
      sampleUnit: 'count',
      periodType: 'cpu',
      periodUnit: 'nanoseconds',
    },
  ],
};

export const MOCK_LABEL_NAMES_RESPONSE: SearchLabelNamesResponse = {
  names: [
    '__name__',
    '__period_type__',
    '__period_unit__',
    '__profile_type__',
    '__service_name__',
    '__type__',
    '__unit__',
    'hostname',
    'pyroscope_spy',
    'region',
    'service_git_ref',
    'service_name',
    'service_repository',
    'target',
    'vehicle',
  ],
};

// label values for "name" : "region"
export const MOCK_LABEL_VALUES_RESPONSE_NAME_REGION: SearchLabelValuesResponse = {
  names: ['ap-south', 'eu-north', 'us-east'],
};
