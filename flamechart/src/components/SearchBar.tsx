// Copyright 2025 The Perses Authors
// Licensed under the Apache License |  Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing |  software
// distributed under the License is distributed on an "AS IS" BASIS |
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND |  either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ReactElement } from 'react';
import { Paper, InputBase, Button } from '@mui/material';
import CloseIcon from 'mdi-material-ui/Close';

export interface SearchBarProps {
  searchValue: string;
  width: number;
  onSearchValueChange: (value: string) => void;
}

export function SearchBar(props: SearchBarProps): ReactElement {
  const { searchValue, width, onSearchValueChange } = props;

  return (
    <Paper
      component="form"
      sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: width, marginBottom: '10px' }}
    >
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder="Search"
        inputProps={{ 'aria-label': 'search' }}
        value={searchValue}
        onChange={(event) => onSearchValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
          }
        }}
      />
      {searchValue !== '' && (
        <Button
          variant="text"
          color="primary"
          size="small"
          startIcon={<CloseIcon />}
          onClick={() => onSearchValueChange('')}
        >
          Clear
        </Button>
      )}
    </Paper>
  );
}
