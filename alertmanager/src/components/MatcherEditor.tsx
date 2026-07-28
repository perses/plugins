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

import { ReactElement, useId } from 'react';
import {
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import DeleteIcon from 'mdi-material-ui/Delete';

export interface MatcherValue {
  name: string;
  value: string;
  isEqual: boolean;
  isRegex: boolean;
}

export interface MatcherEditorProps {
  matcher: MatcherValue;
  onChange: (matcher: MatcherValue) => void;
  onRemove: () => void;
}

type MatchType = '=' | '!=' | '=~' | '!~';

function getMatchType(matcher: MatcherValue): MatchType {
  if (matcher.isRegex) {
    return matcher.isEqual ? '=~' : '!~';
  }
  return matcher.isEqual ? '=' : '!=';
}

function parseMatchType(matchType: MatchType): { isEqual: boolean; isRegex: boolean } {
  switch (matchType) {
    case '=':
      return { isEqual: true, isRegex: false };
    case '!=':
      return { isEqual: false, isRegex: false };
    case '=~':
      return { isEqual: true, isRegex: true };
    case '!~':
      return { isEqual: false, isRegex: true };
  }
}

/**
 * A form for editing a single matcher with fields for name, value, and match type.
 */
export function MatcherEditor({ matcher, onChange, onRemove }: MatcherEditorProps): ReactElement {
  const matchTypeLabelId = useId();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange({ ...matcher, name: e.target.value });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange({ ...matcher, value: e.target.value });
  };

  const handleMatchTypeChange = (e: SelectChangeEvent): void => {
    const { isEqual, isRegex } = parseMatchType(e.target.value as MatchType);
    onChange({ ...matcher, isEqual, isRegex });
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <TextField
        label="Label name"
        value={matcher.name}
        onChange={handleNameChange}
        size="small"
        sx={{ minWidth: 150 }}
      />
      <FormControl size="small" sx={{ minWidth: 80 }}>
        <InputLabel id={matchTypeLabelId}>Match</InputLabel>
        <Select labelId={matchTypeLabelId} value={getMatchType(matcher)} onChange={handleMatchTypeChange} label="Match">
          <MenuItem value="=">=</MenuItem>
          <MenuItem value="!=">!=</MenuItem>
          <MenuItem value="=~">=~</MenuItem>
          <MenuItem value="!~">!~</MenuItem>
        </Select>
      </FormControl>
      <TextField label="Value" value={matcher.value} onChange={handleValueChange} size="small" sx={{ minWidth: 200 }} />
      <IconButton onClick={onRemove} size="small" aria-label="Remove matcher">
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
