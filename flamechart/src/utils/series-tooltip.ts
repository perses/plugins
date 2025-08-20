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

import { SeriesSample } from './data-model';
import { formatItemValue } from './format';

export function getSeriesTooltip(
  data: SeriesSample,
  unit: string,
  name: string,
  color: string,
  divColor: string
): string {
  const date = new Date(data.value[0]);
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const formattedTime = date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return `
    <div>
      <div>
        ${formattedDate} - <b>${formattedTime}</b>
      </div>
      <hr style="border: none; border-top: 1px solid ${divColor}" />
      <div style="display: flex; align-items: center">
        <div style="margin-right: 8px; display: inline-block; width: 11px; height: 11px; border-radius: 2px; background-color: ${color}"></div>
        <div style="width: 100%; display: flex; justify-content: space-between" >
            <span style="margin-right: 8px">${name}</span> <b>${formatItemValue(unit, data.value[1])}</b>
        </div>
      </div>
    </div>
  `;
}
