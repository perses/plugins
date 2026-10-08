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

import { Stack, TextField, Typography } from '@mui/material';
import type { DatasourceEditorProps } from '@perses-dev/plugin-system';
import type { ChangeEvent, ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';

import type { CloudWatchDatasourceSpec } from './cloudwatch-datasource-types';
import {
  CLOUDWATCH_ALLOWED_ENDPOINTS,
  getCloudWatchEndpoint,
  getRegionFromEndpoint,
  isValidRegion,
  validateCloudWatchDatasourceSpec,
} from './cloudwatch-datasource-types';

export function CloudWatchDatasourceEditor({
  value,
  onChange,
  isReadonly,
}: DatasourceEditorProps<CloudWatchDatasourceSpec>): ReactElement {
  const proxySpec = value.proxy.spec;
  const [region, setRegion] = useState(getRegionFromEndpoint(proxySpec.url) ?? '');
  const errors = useMemo(() => validateCloudWatchDatasourceSpec(value), [value]);
  const readOnlyProps = useMemo(() => ({ input: { readOnly: isReadonly } }), [isReadonly]);

  const handleRegionChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const newRegion = event.target.value.trim();
      setRegion(newRegion);
      if (isValidRegion(newRegion)) {
        onChange({
          ...value,
          proxy: {
            kind: 'HTTPProxy',
            spec: {
              ...proxySpec,
              url: getCloudWatchEndpoint(newRegion),
              allowedEndpoints: CLOUDWATCH_ALLOWED_ENDPOINTS,
            },
          },
        });
      }
    },
    [onChange, proxySpec, value],
  );

  const handleSecretChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const secret = event.target.value.trim();
      onChange({ ...value, proxy: { kind: 'HTTPProxy', spec: { ...proxySpec, secret: secret || undefined } } });
    },
    [onChange, proxySpec, value],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="body2">
        The requests are sent through the Perses server, which signs them with the SigV4 credentials of the secret. AWS
        credentials are never sent to the browser.
      </Typography>
      <TextField
        label="Region"
        required
        fullWidth
        value={region}
        error={region !== '' && !isValidRegion(region)}
        helperText={`AWS region of the CloudWatch API, for example us-east-1. Endpoint: ${proxySpec.url}`}
        slotProps={readOnlyProps}
        onChange={handleRegionChange}
      />
      <TextField
        label="Secret"
        required
        fullWidth
        value={proxySpec.secret ?? ''}
        error={!!errors.secret}
        helperText={
          errors.secret ??
          'Name of the secret holding the SigV4 configuration (region, service name "monitoring", credentials or role).'
        }
        slotProps={readOnlyProps}
        onChange={handleSecretChange}
      />
    </Stack>
  );
}
