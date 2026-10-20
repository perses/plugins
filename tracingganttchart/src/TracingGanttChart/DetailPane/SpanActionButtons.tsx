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

import { Button, CircularProgress } from '@mui/material';
import { useFetch } from '@perses-dev/client';
import { Dialog, useItemActions } from '@perses-dev/components';
import type { ItemAction } from '@perses-dev/plugin-system';
import { ACTION_ICONS, executeAction, useAllVariableValues } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';

import type { SpanActionItem } from '../span-actions';

export interface SpanActionButtonsProps {
  actions: ItemAction[];
  item: SpanActionItem;
}

/**
 * SpanActionButtons renders the item actions of a span as standard buttons.
 * This is a partial implementation of the item actions of the panel header (useSelectionItemActions of @perses-dev/dashboards),
 * which only renders icon buttons. Actions are always executed with the given span, independently of the panel selection.
 * It is only rendered if actions are configured, so the detail pane does not subscribe to variables otherwise.
 */
export function SpanActionButtons(props: SpanActionButtonsProps): ReactElement {
  const { actions, item } = props;
  const variableState = useAllVariableValues();
  const { actionStatuses, setActionStatus } = useItemActions<string>();
  const { fetch } = useFetch();
  // the action is kept after closing the dialog, to keep its content during the closing transition
  const [confirmState, setConfirmState] = useState<{ open: boolean; action?: ItemAction }>({ open: false });

  const execute = useCallback(
    (action: ItemAction) =>
      executeAction({
        action,
        selectionMap: new Map([[item.id, item.data]]),
        variableState,
        setActionStatus,
        fetchFn: fetch,
      }),
    [item, variableState, setActionStatus, fetch],
  );

  const handleClick = useCallback(
    (action: ItemAction): void => {
      if (action.confirmMessage) {
        setConfirmState({ open: true, action });
      } else {
        void execute(action);
      }
    },
    [execute],
  );

  const closeConfirm = useCallback((): void => setConfirmState((prev) => ({ ...prev, open: false })), []);

  const handleConfirm = useCallback((): void => {
    closeConfirm();
    if (confirmState.action) {
      void execute(confirmState.action);
    }
  }, [closeConfirm, confirmState.action, execute]);

  return (
    <>
      {actions
        // consistent with the item actions of the panel header
        .filter((action) => action.enabled)
        .map((action) => (
          <SpanActionButton
            key={action.name}
            action={action}
            loading={actionStatuses.get(action.name)?.itemStatuses?.get(item.id)?.loading ?? false}
            onClick={handleClick}
          />
        ))}
      <Dialog open={confirmState.open} onClose={closeConfirm}>
        <Dialog.Header onClose={closeConfirm}>{`Confirm: ${confirmState.action?.name ?? ''}`}</Dialog.Header>
        <Dialog.Content>{confirmState.action?.confirmMessage}</Dialog.Content>
        <Dialog.Actions>
          <Dialog.PrimaryButton onClick={handleConfirm}>Confirm</Dialog.PrimaryButton>
          <Dialog.SecondaryButton onClick={closeConfirm}>Cancel</Dialog.SecondaryButton>
        </Dialog.Actions>
      </Dialog>
    </>
  );
}

const loadingIcon = <CircularProgress size={14} color="inherit" />;

interface SpanActionButtonProps {
  action: ItemAction;
  loading: boolean;
  onClick: (action: ItemAction) => void;
}

function SpanActionButton(props: SpanActionButtonProps): ReactElement {
  const { action, loading, onClick } = props;
  const handleClick = useCallback(() => onClick(action), [onClick, action]);
  const icon = loading ? loadingIcon : ACTION_ICONS.find((i) => i.value === action.icon)?.icon;

  return (
    <Button variant="outlined" size="small" startIcon={icon} disabled={loading} onClick={handleClick}>
      {action.name}
    </Button>
  );
}
