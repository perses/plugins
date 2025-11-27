// Copyright 2024 The Perses Authors
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
  Box,
  Button,
  ButtonGroup,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormLabel,
  IconButton,
  Stack,
  StackProps,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { ReactElement, useState } from 'react';
import {
  AlignSelector,
  FormatControls,
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsEditorGroup,
  SortSelectorButtons,
  Dialog,
} from '@perses-dev/components';
import { FormatOptions } from '@perses-dev/core';
import { PluginKindSelect } from '@perses-dev/plugin-system';
import ContentCopyIcon from 'mdi-material-ui/ContentCopy';
import DeleteIcon from 'mdi-material-ui/Delete';
import InformationIcon from 'mdi-material-ui/Information';
import LinkIcon from 'mdi-material-ui/Link';
import { ColumnSettings } from '../../models';
import { ConditionalPanel } from '../ConditionalPanel';

const DEFAULT_FORMAT: FormatOptions = {
  unit: 'decimal',
  shortValues: true,
};

type OmittedMuiProps = 'children' | 'value' | 'onChange';

export interface ColumnEditorProps extends Omit<StackProps, OmittedMuiProps> {
  column: ColumnSettings;
  onChange: (column: ColumnSettings) => void;
}

type LinkManagementDialogueProps = Pick<ColumnEditorProps, 'onChange' | 'column'> & {
  actionTitle: string;
  open: boolean;
  setOpen: (value: boolean) => void;
};
const LinkManagementDialog = (props: LinkManagementDialogueProps): ReactElement => {
  const {
    actionTitle,
    open,
    column: { dataLink },
    column,
    onChange,
    setOpen,
  } = props;

  const [url, setUrl] = useState(dataLink?.url);
  const [title, setTitle] = useState(dataLink?.title);
  const [openNewTab, setOpenNewTab] = useState(!!dataLink?.openNewTab);

  const handleSaveDataLink = (): void => {
    if (!url) return;
    onChange({ ...column, dataLink: { url, title, openNewTab } });
    setOpen(false);
  };

  return (
    <Dialog
      sx={{
        '& .MuiDialog-paper': {
          width: '80vw',
        },
      }}
      open={open}
    >
      <DialogTitle>{actionTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <FormControl>
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <FormLabel>URL</FormLabel>
            </Box>
            <TextField
              onChange={(e) => {
                setUrl(e.target.value);
              }}
              type="url"
              placeholder="http://target.com/x/{dynamic}/z"
              value={url}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Title</FormLabel>
            <TextField
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              placeholder="Title"
              type="text"
              value={title}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Open in new tab</FormLabel>
            <FormControl>
              <Switch
                onChange={(e) => {
                  setOpenNewTab(e.target.checked);
                }}
                checked={openNewTab}
              />
            </FormControl>
          </FormControl>
          <FormControl>
            <Stack direction="row" spacing={1} alignItems="center">
              <InformationIcon fontSize="small" />
              <Typography variant="body1">
                {`You can create dynamic links by proper positioning of {dynamic}`}
              </Typography>
            </Stack>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={handleSaveDataLink}>
          Save
        </Button>
        <Button
          onClick={() => {
            setOpen(false);
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export function ColumnEditor({ column, onChange, ...others }: ColumnEditorProps): ReactElement {
  const [width, setWidth] = useState<number>(
    column.width === undefined || column.width === 'auto' ? 100 : column.width
  );

  const [openAddLinkDialogue, setOpenAddLinkDialogue] = useState<boolean>(false);
  const linkManagementAction = column?.dataLink ? 'Edit Link' : 'Add Link';

  return (
    <Stack {...others}>
      <LinkManagementDialog
        actionTitle={linkManagementAction}
        onChange={onChange}
        column={column}
        open={openAddLinkDialogue}
        setOpen={setOpenAddLinkDialogue}
      />
      <OptionsEditorGrid>
        <OptionsEditorColumn>
          <OptionsEditorGroup title="Column">
            <OptionsEditorControl
              label="Name*"
              control={
                <TextField
                  value={column.name}
                  onChange={(e) => onChange({ ...column, name: e.target.value })}
                  required
                />
              }
            />
            <OptionsEditorControl
              label="Header"
              control={
                <TextField
                  value={column.header ?? ''}
                  onChange={(e) => onChange({ ...column, header: e.target.value ? e.target.value : undefined })}
                />
              }
            />
            <OptionsEditorControl
              label="Header Tooltip"
              control={
                <TextField
                  value={column.headerDescription ?? ''}
                  onChange={(e) =>
                    onChange({ ...column, headerDescription: e.target.value ? e.target.value : undefined })
                  }
                />
              }
            />
            <OptionsEditorControl
              label="Cell Tooltip"
              control={
                <TextField
                  value={column.cellDescription ?? ''}
                  onChange={(e) =>
                    onChange({ ...column, cellDescription: e.target.value ? e.target.value : undefined })
                  }
                />
              }
            />
            <OptionsEditorControl
              label="Enable sorting"
              control={
                <Switch
                  checked={column.enableSorting ?? false}
                  onChange={(e) => onChange({ ...column, enableSorting: e.target.checked })}
                />
              }
            />
            {column.enableSorting && (
              <OptionsEditorControl
                label="Default Sort"
                control={
                  <SortSelectorButtons
                    size="medium"
                    value={column.sort}
                    sx={{
                      margin: 0.5,
                    }}
                    onChange={(sort) => onChange({ ...column, sort: sort })}
                  />
                }
              />
            )}
          </OptionsEditorGroup>
        </OptionsEditorColumn>

        <OptionsEditorColumn>
          <OptionsEditorGroup title="Visual">
            <OptionsEditorControl
              label="Show column"
              control={
                <Switch
                  checked={!(column.hide ?? false)}
                  onChange={(e) => onChange({ ...column, hide: !e.target.checked })}
                />
              }
            />
            <OptionsEditorControl
              label="Display"
              control={
                <ButtonGroup aria-label="Display" size="small">
                  <Button
                    variant={!column.plugin ? 'contained' : 'outlined'}
                    onClick={() => onChange({ ...column, plugin: undefined })}
                  >
                    Text
                  </Button>
                  <Button
                    variant={column.plugin ? 'contained' : 'outlined'}
                    onClick={() => onChange({ ...column, plugin: { kind: 'StatChart', spec: {} } })}
                  >
                    Embedded Panel
                  </Button>
                </ButtonGroup>
              }
            />
            {column.plugin ? (
              <OptionsEditorControl
                label="Panel Type"
                control={
                  <PluginKindSelect
                    pluginTypes={['Panel']}
                    value={{ type: 'Panel', kind: column.plugin.kind }}
                    onChange={(event) => onChange({ ...column, plugin: { kind: event.kind, spec: {} } })}
                  />
                }
              />
            ) : (
              <FormatControls
                value={column.format ?? DEFAULT_FORMAT}
                onChange={(newFormat): void =>
                  onChange({
                    ...column,
                    format: newFormat,
                  })
                }
              />
            )}
            <OptionsEditorControl
              label="Alignment"
              control={
                <AlignSelector
                  size="small"
                  value={column.align ?? 'left'}
                  onChange={(align) => onChange({ ...column, align: align })}
                />
              }
            />
            <OptionsEditorControl
              label="Custom width"
              control={
                <Switch
                  checked={column.width !== undefined && column.width !== 'auto'}
                  onChange={(e) => onChange({ ...column, width: e.target.checked ? width : 'auto' })}
                />
              }
            />
            {column.width !== undefined && column.width !== 'auto' && (
              <OptionsEditorControl
                label="Width"
                control={
                  <TextField
                    type="number"
                    value={width}
                    slotProps={{ htmlInput: { min: 1 } }}
                    onChange={(e) => {
                      setWidth(+e.target.value);
                      onChange({ ...column, width: +e.target.value });
                    }}
                  />
                }
              />
            )}
          </OptionsEditorGroup>
        </OptionsEditorColumn>
        <OptionsEditorColumn>
          <OptionsEditorGroup title="Link and Actions">
            <OptionsEditorControl
              label="Link"
              control={
                <Button
                  startIcon={<LinkIcon />}
                  onClick={(): void => {
                    setOpenAddLinkDialogue(true);
                  }}
                >
                  {linkManagementAction}
                </Button>
              }
            />
            {column?.dataLink?.url && (
              <Stack direction="row" spacing={1} alignItems="center" alignContent="center">
                <Typography sx={{ flexGrow: 1, minWidth: 0 }} component="span" variant="body1" noWrap>
                  {column?.dataLink?.title || column?.dataLink?.url}
                </Typography>
                <IconButton
                  onClick={(): void => {
                    if (column?.dataLink?.url) navigator.clipboard.writeText(column?.dataLink?.url);
                  }}
                  size="small"
                >
                  <ContentCopyIcon fontSize="small" sx={{ verticalAlign: 'middle' }} />
                </IconButton>
                <IconButton
                  onClick={(): void => {
                    onChange({ ...column, dataLink: undefined });
                  }}
                  size="small"
                >
                  <DeleteIcon fontSize="small" sx={{ verticalAlign: 'middle' }} />
                </IconButton>
              </Stack>
            )}
          </OptionsEditorGroup>
        </OptionsEditorColumn>
      </OptionsEditorGrid>
      <Stack sx={{ px: 8 }}>
        <OptionsEditorGroup title="Conditional Cell Format">
          <ConditionalPanel
            cellSettings={column.cellSettings}
            onChange={(cellSettings) => onChange({ ...column, cellSettings })}
          />
        </OptionsEditorGroup>
      </Stack>
    </Stack>
  );
}
