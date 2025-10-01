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
import { Box, Typography, useTheme } from '@mui/material';

interface EmptyLogsStateProps {
  message?: string;
}

export const EmptyLogsState: React.FC<EmptyLogsStateProps> = ({ message = 'No logs to display' }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: theme.palette.text.secondary,
          fontSize: '14px',
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};
