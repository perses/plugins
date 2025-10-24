import React from 'react';
import {
  Button,
  Divider,
  Grid2Props as GridProps,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Grid2 as Grid,
} from '@mui/material';
import DeleteIcon from 'mdi-material-ui/DeleteOutline';
import AddIcon from 'mdi-material-ui/Plus';
import { OptionsColorPicker } from '@perses-dev/components';
import { CellSettings, renderConditionEditor } from '../models';

// Individual conditional formatting rule component
export interface ConditionalRuleProps extends Omit<GridProps, 'onChange'> {
  cell: CellSettings;
  onChange: (cell: CellSettings) => void;
  onDelete: () => void;
}

export function ConditionalRule({ cell, onChange, onDelete, ...props }: ConditionalRuleProps) {
  return (
    <Grid container spacing={2} {...props}>
      <Grid size={{ xs: 5 }}>
        <Stack direction="row" gap={1} width="100%">
          <TextField
            select
            label="Type"
            value={cell.condition.kind}
            onChange={(e) => onChange({ ...cell, condition: { kind: e.target.value } } as CellSettings)}
            required
            sx={{ width: '120px' }}
          >
            <MenuItem value="Value">
              <Stack>
                <Typography>Value</Typography>
                {cell.condition.kind !== 'Value' && (
                  <Typography variant="caption">Matches an exact text value</Typography>
                )}
              </Stack>
            </MenuItem>
            <MenuItem value="Range">
              <Stack>
                <Typography>Range</Typography>
                {cell.condition.kind !== 'Range' && (
                  <Typography variant="caption">Matches against a numerical range</Typography>
                )}
              </Stack>
            </MenuItem>
            <MenuItem value="Regex">
              <Stack>
                <Typography>Regex</Typography>
                {cell.condition.kind !== 'Regex' && (
                  <Typography variant="caption">Matches against a regular expression</Typography>
                )}
              </Stack>
            </MenuItem>
            <MenuItem value="Misc">
              <Stack>
                <Typography>Misc</Typography>
                {cell.condition.kind !== 'Misc' && (
                  <Typography variant="caption">Matches against empty, null and NaN values</Typography>
                )}
              </Stack>
            </MenuItem>
          </TextField>
          {renderConditionEditor(
            cell.condition,
            (updatedCondition) => onChange({ ...cell, condition: updatedCondition }),
            'small'
          )}
        </Stack>
      </Grid>
      <Grid size={{ xs: 4 }}>
        <Stack spacing={1}>
          <TextField
            label="Display text"
            value={cell.text}
            onChange={(e) => onChange({ ...cell, text: e.target.value })}
            fullWidth
            size="small"
          />
          <Stack direction="row" spacing={1}>
            <TextField
              label="Prefix"
              placeholder="$"
              value={cell.prefix ?? ''}
              onChange={(e) => onChange({ ...cell, prefix: e.target.value })}
              size="small"
            />
            <TextField
              label="Suffix"
              placeholder="%"
              value={cell.suffix ?? ''}
              onChange={(e) => onChange({ ...cell, suffix: e.target.value })}
              size="small"
            />
          </Stack>
        </Stack>
      </Grid>
      <Grid size={{ xs: 1 }}>
        <Stack direction="row" justifyContent="center" gap={1}>
          {cell.textColor ? (
            <OptionsColorPicker
              label="Text Color"
              color={cell.textColor ?? '#000'}
              onColorChange={(color) => onChange({ ...cell, textColor: color } as CellSettings)}
              onClear={() => onChange({ ...cell, textColor: undefined } as CellSettings)}
            />
          ) : (
            <IconButton onClick={() => onChange({ ...cell, textColor: '#000' })}>
              <AddIcon />
            </IconButton>
          )}
        </Stack>
      </Grid>
      <Grid size={{ xs: 1 }}>
        <Stack direction="row" justifyContent="center">
          {cell.backgroundColor ? (
            <OptionsColorPicker
              label="Background Color"
              color={cell.backgroundColor ?? '#fff'}
              onColorChange={(color) => onChange({ ...cell, backgroundColor: color } as CellSettings)}
              onClear={() => onChange({ ...cell, backgroundColor: undefined } as CellSettings)}
            />
          ) : (
            <IconButton onClick={() => onChange({ ...cell, backgroundColor: '#000' })}>
              <AddIcon />
            </IconButton>
          )}
        </Stack>
      </Grid>
      <Grid size={{ xs: 1 }} textAlign="end">
        <Tooltip title="Remove cell settings" placement="top">
          <IconButton size="small" sx={{ marginLeft: 'auto' }} onClick={onDelete} key="delete-cell-button">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Grid>
    </Grid>
  );
}

// Complete conditional formatting panel with headers and list management
export interface ConditionalPanelProps {
  cellSettings?: CellSettings[];
  onChange: (cellSettings: CellSettings[] | undefined) => void;
  addButtonText?: string;
}

export function ConditionalPanel({
  cellSettings = [],
  onChange,
  addButtonText = 'Add Conditional Format',
}: ConditionalPanelProps) {
  const handleCellChange = (index: number, updatedCell: CellSettings) => {
    const updatedCells = [...cellSettings];
    updatedCells[index] = updatedCell;
    onChange(updatedCells);
  };

  const handleCellDelete = (index: number) => {
    const updatedCells = [...cellSettings];
    updatedCells.splice(index, 1);
    onChange(updatedCells.length > 0 ? updatedCells : undefined);
  };

  const handleAddCell = () => {
    const updatedCells = [...cellSettings];
    updatedCells.push({ condition: { kind: 'Value', spec: { value: '' } } });
    onChange(updatedCells);
  };

  return (
    <Stack spacing={3} sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 5 }}>
          <Typography variant="subtitle1">Condition</Typography>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Typography variant="subtitle1">Display Text</Typography>
        </Grid>
        <Grid size={{ xs: 1 }} textAlign="center">
          <Typography variant="subtitle1">Color</Typography>
        </Grid>
        <Grid size={{ xs: 1 }} textAlign="center">
          <Typography variant="subtitle1">Background</Typography>
        </Grid>
        <Grid size={{ xs: 1 }}></Grid>
      </Grid>
      <Stack gap={1.5} divider={<Divider flexItem orientation="horizontal" />}>
        {cellSettings.map((cell, i) => (
          <ConditionalRule
            key={i}
            cell={cell}
            onChange={(updatedCell: CellSettings) => handleCellChange(i, updatedCell)}
            onDelete={() => handleCellDelete(i)}
          />
        ))}
      </Stack>
      <Button variant="outlined" startIcon={<AddIcon />} sx={{ marginTop: 1 }} onClick={handleAddCell}>
        {addButtonText}
      </Button>
    </Stack>
  );
}
