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
import { Stack, Breadcrumbs } from '@mui/material';
import ChevronRightIcon from 'mdi-material-ui/ChevronRight';
import EyeIcon from 'mdi-material-ui/EyeOutline';
import CloseIcon from 'mdi-material-ui/Close';
import Chip from '@mui/material/Chip';
import { emphasize, styled } from '@mui/material/styles';
import { formatValue } from '@perses-dev/core';

export interface CustomBreadcrumbProps {
  totalValue: string;
  totalSample: number;
  otherItemSample: number | undefined;
  onSelectedIdChange: (newId: number) => void;
}

const StyledBreadcrumb = styled(Chip)(({ theme }) => {
  const backgroundColor = theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800];
  return {
    backgroundColor,
    height: theme.spacing(3),
    color: theme.palette.text.primary,
    fontWeight: theme.typography.fontWeightRegular,
    '&:hover, &:focus': {
      backgroundColor: emphasize(backgroundColor, 0.06),
    },
    '&:active': {
      boxShadow: theme.shadows[1],
      backgroundColor: emphasize(backgroundColor, 0.12),
    },
  };
});

export function CustomBreadcrumb(props: CustomBreadcrumbProps): ReactElement {
  const { totalValue, totalSample, otherItemSample, onSelectedIdChange } = props;

  const handleClick = (event: React.MouseEvent<Element, MouseEvent>) => {
    event.preventDefault();
    onSelectedIdChange(0);
  };

  const splitedValue = totalValue.split('(');
  const totalValueText = splitedValue[splitedValue.length - 1]?.slice(0, -1);

  const totalLabel = formatValue(totalSample, { unit: 'decimal', decimalPlaces: 2, shortValues: true }) + ' samples';

  return (
    <Stack direction="row" spacing={1}>
      <Breadcrumbs separator={<ChevronRightIcon fontSize="small" />} aria-label="breadcrumb">
        <StyledBreadcrumb label={totalValueText + '  |  ' + totalLabel} />
        {otherItemSample !== undefined && (
          <StyledBreadcrumb
            label={((otherItemSample / totalSample) * 100).toFixed(2) + '% of total'}
            icon={<EyeIcon fontSize="small" color="secondary" />}
            deleteIcon={<CloseIcon fontSize="small" />}
            onDelete={handleClick}
          />
        )}
      </Breadcrumbs>
    </Stack>
  );
}
