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

import { useSelectionItemActions } from '@perses-dev/dashboards';
import type { ItemAction } from '@perses-dev/plugin-system';
import { useAllVariableValues } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';

import type { SpanActionItem } from '../span-actions';

export interface SpanActionButtonsProps {
  actions: ItemAction[];
  item: SpanActionItem;
}

/**
 * SpanActionButtons renders the item action buttons of a span.
 * It is only rendered if actions are configured, so the detail pane does not subscribe to variables and selection otherwise.
 */
export function SpanActionButtons(props: SpanActionButtonsProps): ReactElement {
  const { actions, item } = props;
  const variableValues = useAllVariableValues();
  const { getItemActionButtons, confirmDialog } = useSelectionItemActions({
    actions,
    variableState: variableValues,
  });

  return (
    <>
      {getItemActionButtons(item)}
      {confirmDialog}
    </>
  );
}
