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

import type { DatasourceClient } from '@perses-dev/plugin-system';
import type { HTTPDatasourceSpec } from '@perses-dev/spec';

import type { ClickStackClient } from '../../model/click-stack-client';

export interface ClickStackDatasourceSpec extends HTTPDatasourceSpec {
  /** URL of the ClickStack UI, as users open it in their browser. The alerts link to it. */
  uiUrl?: string;
}

interface ClickStackDatasourceClientOptions {
  datasourceUrl: string;
  uiUrl?: string;
}

export interface ClickStackDatasourceClient extends DatasourceClient, ClickStackClient {
  options: ClickStackDatasourceClientOptions;
}
