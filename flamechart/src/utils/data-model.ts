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

/**
 * FlameChart datamodel
 */
export interface FlameChartSample {
  name: number;
  value: [
    level: number,
    start_val: number,
    end_val: number,
    name: string,
    total_percentage: number,
    self_percentage: number,
    shortName: string,
    self: number,
    total: number,
  ];
  itemStyle: {
    color: string;
  };
}

/**
 * TableChart datamodel
 */
export interface TableChartSample {
  id: number;
  name: string;
  self: number;
  total: number;
}
