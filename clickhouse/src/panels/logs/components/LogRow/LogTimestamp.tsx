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

import React from 'react';
import { Typography, useTheme } from '@mui/material';

interface LogTimestampProps {
  timestamp: number;
}

export const LogTimestamp: React.FC<LogTimestampProps> = ({ timestamp }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Typography
      variant="caption"
      sx={{
        color: isDarkMode ? '#000000' : theme.palette.text.secondary,
        fontSize: '12px',
        whiteSpace: 'nowrap',
        minWidth: 'max-content',
        backgroundColor: '#FFF3E0',
      }}
    >
      {timestamp}
    </Typography>
  );
};
