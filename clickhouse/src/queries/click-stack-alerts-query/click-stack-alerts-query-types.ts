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

import type { ClickStackAlertSource, ClickStackAlertState } from '../../model/click-stack-client';
import type { ClickStackDatasourceSelectValue } from '../../model/click-stack-selectors';

/** States of the alerts listed when a query does not select any: the alerts that are firing or about to. */
export const DEFAULT_ALERT_STATES: readonly ClickStackAlertState[] = ['ALERT', 'PENDING'];

export interface ClickStackAlertsQuerySpec {
  datasource?: ClickStackDatasourceSelectValue;
  /** Only the alerts in one of these states. Defaults to the firing and pending ones. */
  states?: ClickStackAlertState[];
  /** Only the alerts watching one of these kinds of sources. Defaults to all of them. */
  sources?: ClickStackAlertSource[];
  /** Only the alerts with one of these tags. Variables are supported: a variable with several values is as many tags. */
  tags?: string[];
  /** Only the alerts whose name contains this text. Variables are supported. */
  search?: string;
}
