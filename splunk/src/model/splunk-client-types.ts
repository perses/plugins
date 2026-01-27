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

export type SplunkRequestHeaders = Record<string, string>;

export interface SplunkJobCreateResponse {
  sid: string;
}

export interface SplunkJobStatusResponse {
  entry: Array<{
    content: {
      dispatchState: string;
      isDone: boolean;
      isFailed: boolean;
      isFinalized: boolean;
      resultCount: number;
      eventCount: number;
    };
  }>;
}

export interface SplunkResult {
  [key: string]: string | number;
}

export interface SplunkResultsResponse {
  results: SplunkResult[];
  preview: boolean;
  init_offset: number;
}

export interface SplunkEventsResponse {
  results: SplunkResult[];
}

export interface SplunkTimeSeriesResults {
  results: Array<{
    _time: string;
    [key: string]: string | number;
  }>;
}

export interface SplunkLogResults {
  results: Array<{
    _time: string;
    _raw: string;
    [key: string]: string | number;
  }>;
}

export interface SplunkIndexResponse {
  entry: Array<{
    name: string;
    content: {
      totalEventCount: number;
      currentDBSizeMB: number;
    };
  }>;
}
