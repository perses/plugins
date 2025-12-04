import { Box, Stack, Typography } from '@mui/material';
import { ReactElement } from 'react';

export function LogExplorer(): ReactElement {
  return (
    <Stack gap={2} sx={{ width: '100%' }}>
      <Box
        height={700}
        sx={{
          border: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#777',
        }}
      >
        <Typography variant="body2">Log Explorer Placeholder</Typography>
      </Box>
    </Stack>
  );
}
