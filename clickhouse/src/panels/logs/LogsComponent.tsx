import { ReactElement } from 'react';
import { LogsProps } from './logs-types';
import { Typography } from '@mui/material';
import LogsList from './components/LogsList';

export function LogsComponent(props: LogsProps): ReactElement | null {
  const { queryResults, spec } = props;

  console.log('Panel data', queryResults);
  console.log('Panel spec', spec);

  if (queryResults[0]?.data.logs === undefined) {
    return (
      <Typography
        variant="h3"
        sx={{
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        No logs to display
      </Typography>
    );
  }
  const logs = queryResults[0]?.data.logs.entries;

  return <LogsList logs={logs} />;
}
