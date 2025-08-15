import { OptionsEditorColumn, OptionsEditorControl, OptionsEditorGrid } from '@perses-dev/components';
import { TextField, Typography } from '@mui/material';
import { HTTPSettingsEditor } from '@perses-dev/plugin-system';
import React, { ReactElement } from 'react';
import { ClickHouseDatasourceSpec } from './click-house-datasource-types';

export interface ClickHouseDatasourceEditorProps {
  value: ClickHouseDatasourceSpec;
  onChange: (next: ClickHouseDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function ClickHouseDatasourceEditor(props: ClickHouseDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const initialSpecDirect: ClickHouseDatasourceSpec = {
    directUrl: '',
  };

  const initialSpecProxy: ClickHouseDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          {
            endpointPattern: '/clickhouse',
            method: 'GET',
          },
        ],
        url: '',
      },
    },
  };

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, username: event.target.value });
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, password: event.target.value });
  };

  return (
    <>
      <HTTPSettingsEditor
        value={value}
        onChange={onChange}
        isReadonly={isReadonly}
        initialSpecDirect={initialSpecDirect}
        initialSpecProxy={initialSpecProxy}
      />
      <Typography variant="h4" mb={2} mt={3}>
        Authentication
      </Typography>
      <OptionsEditorGrid>
        <OptionsEditorColumn>
          <OptionsEditorControl
            label="Username"
            control={
              <TextField
                size="small"
                variant="outlined"
                value={value.username || ''}
                onChange={handleUsernameChange}
                disabled={isReadonly}
                placeholder="ClickHouse username"
                fullWidth
              />
            }
          />
          <OptionsEditorControl
            label="Password"
            control={
              <TextField
                size="small"
                variant="outlined"
                type="password"
                value={value.password || ''}
                onChange={handlePasswordChange}
                disabled={isReadonly}
                placeholder="ClickHouse password"
                fullWidth
              />
            }
          />
        </OptionsEditorColumn>
      </OptionsEditorGrid>
    </>
  );
}
