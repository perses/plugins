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

import { ReactElement } from 'react';
import { Button } from '@mui/material';

export interface AddFilterItemProps {
  onClick: () => void;
}

export function AddFilterItem(props: AddFilterItemProps): ReactElement {
  const { onClick } = props;

  return (
    <Button
      sx={{
        width: '40px',
        minWidth: 'unset', // Disable the default minWidth
        border: '1px solid rgba(0, 0, 0, 0.23)',
        color: 'grey',
        fontSize: '1.3rem',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: 'black',
          backgroundColor: 'white',
        },
      }}
      onClick={onClick}
    >
      +
    </Button>
  );
}
