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
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { OptionsEditorGroup } from '@perses-dev/components';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import DeleteIcon from 'mdi-material-ui/Delete';
import PlusIcon from 'mdi-material-ui/Plus';
import { ReactElement, useCallback, useRef } from 'react';
import { AlertTableOptions, LabelColorMapping, LabelColorOverride } from './alert-table-model';

const MODE_LABELS: Record<LabelColorMapping['mode'], string> = {
  auto: 'Auto (hash-derived colors)',
  severity: 'Severity (built-in defaults)',
  manual: 'Manual (overrides only)',
};

function LabelMappingEntry({
  mapping,
  index,
  onUpdate,
  onRemove,
}: {
  mapping: LabelColorMapping;
  index: number;
  onUpdate: (index: number, updater: (draft: LabelColorMapping) => void) => void;
  onRemove: (index: number) => void;
}): ReactElement {
  const handleAddOverride = useCallback((): void => {
    onUpdate(index, (draft) => {
      if (!draft.overrides) draft.overrides = [];
      draft.overrides.push({ value: '', isRegex: false, color: '#1976d2' });
    });
  }, [index, onUpdate]);

  const handleRemoveOverride = useCallback(
    (overrideIndex: number): void => {
      onUpdate(index, (draft) => {
        draft.overrides?.splice(overrideIndex, 1);
      });
    },
    [index, onUpdate]
  );

  const handleUpdateOverride = useCallback(
    (overrideIndex: number, field: keyof LabelColorOverride, fieldValue: string | boolean): void => {
      onUpdate(index, (draft) => {
        const override = draft.overrides?.[overrideIndex];
        if (override) {
          if (field === 'isRegex') {
            override.isRegex = fieldValue as boolean;
          } else {
            override[field] = fieldValue as string;
          }
        }
      });
    },
    [index, onUpdate]
  );

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2">{mapping.labelKey || 'New label'}</Typography>
          <IconButton size="small" onClick={() => onRemove(index)} aria-label="Remove label mapping">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
        <TextField
          label="Label key"
          value={mapping.labelKey}
          onChange={(e) =>
            onUpdate(index, (draft) => {
              draft.labelKey = e.target.value;
            })
          }
          size="small"
          fullWidth
        />
        <FormControl size="small" fullWidth>
          <InputLabel id={`color-mode-label-${index}`}>Mode</InputLabel>
          <Select
            labelId={`color-mode-label-${index}`}
            value={mapping.mode}
            onChange={(e) =>
              onUpdate(index, (draft) => {
                draft.mode = e.target.value as LabelColorMapping['mode'];
              })
            }
            label="Mode"
          >
            {(Object.keys(MODE_LABELS) as Array<LabelColorMapping['mode']>).map((mode) => (
              <MenuItem key={mode} value={mode}>
                {MODE_LABELS[mode]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Overrides
          </Typography>
          <Stack spacing={1}>
            {(mapping.overrides ?? []).map((override, overrideIndex) => (
              <Stack key={overrideIndex} direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Value / Pattern"
                  value={override.value}
                  onChange={(e) => handleUpdateOverride(overrideIndex, 'value', e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={override.isRegex}
                      onChange={(e) => handleUpdateOverride(overrideIndex, 'isRegex', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Regex"
                />
                <input
                  type="color"
                  value={override.color}
                  onChange={(e) => handleUpdateOverride(overrideIndex, 'color', e.target.value)}
                  style={{ width: 36, height: 28, border: 'none', cursor: 'pointer' }}
                />
                <IconButton
                  size="small"
                  onClick={() => handleRemoveOverride(overrideIndex)}
                  aria-label="Remove override"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Button size="small" startIcon={<PlusIcon />} onClick={handleAddOverride}>
              Add override
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

export function AlertTableLabelsEditor(props: OptionsEditorProps<AlertTableOptions>): ReactElement {
  const { value, onChange } = props;
  const mappings = value.labelColorMappings ?? [];

  const handleAddMapping = useCallback((): void => {
    onChange(
      produce(value, (draft) => {
        if (!draft.labelColorMappings) draft.labelColorMappings = [];
        draft.labelColorMappings.push({ labelKey: '', mode: 'auto' });
      })
    );
  }, [value, onChange]);

  const handleRemoveMapping = useCallback(
    (index: number): void => {
      onChange(
        produce(value, (draft) => {
          draft.labelColorMappings?.splice(index, 1);
        })
      );
    },
    [value, onChange]
  );

  const handleUpdateMapping = useCallback(
    (index: number, updater: (draft: LabelColorMapping) => void): void => {
      onChange(
        produce(value, (draft) => {
          const mapping = draft.labelColorMappings?.[index];
          if (mapping) {
            updater(mapping);
          }
        })
      );
    },
    [value, onChange]
  );

  const idCounterRef = useRef(0);
  const idMapRef = useRef(new WeakMap<LabelColorMapping, number>());
  const getStableId = (mapping: LabelColorMapping): number => {
    let id = idMapRef.current.get(mapping);
    if (id === undefined) {
      id = idCounterRef.current++;
      idMapRef.current.set(mapping, id);
    }
    return id;
  };

  return (
    <OptionsEditorGroup title="Label Color Mappings">
      <Stack spacing={2}>
        {mappings.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No label color mappings configured. Add one to color label values in the table.
          </Typography>
        )}
        {mappings.map((mapping, index) => (
          <Box key={getStableId(mapping)}>
            {index > 0 && <Divider sx={{ mb: 2 }} />}
            <LabelMappingEntry
              mapping={mapping}
              index={index}
              onUpdate={handleUpdateMapping}
              onRemove={handleRemoveMapping}
            />
          </Box>
        ))}
        <Button variant="outlined" size="small" startIcon={<PlusIcon />} onClick={handleAddMapping}>
          Add label mapping
        </Button>
      </Stack>
    </OptionsEditorGroup>
  );
}
