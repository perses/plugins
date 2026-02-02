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
import { TextField, Box } from '@mui/material';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { InfluxDBV3Spec } from '../../model';
export function InfluxDBV3Editor({ value, onChange }: OptionsEditorProps<InfluxDBV3Spec>) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Direct URL"
        placeholder="http://localhost:8086"
        value={value?.directUrl || ''}
        onChange={(e) => onChange({ ...value, directUrl: e.target.value })}
        helperText="Optional: URL to access InfluxDB directly from the browser"
        fullWidth
      />
      <TextField
        label="Organization"
        placeholder="myorg"
        value={value?.organization || ''}
        onChange={(e) => onChange({ ...value, organization: e.target.value })}
        helperText="The InfluxDB organization"
        required
        fullWidth
      />
      <TextField
        label="Bucket"
        placeholder="mybucket"
        value={value?.bucket || ''}
        onChange={(e) => onChange({ ...value, bucket: e.target.value })}
        helperText="The InfluxDB bucket to query"
        required
        fullWidth
      />
    </Box>
  );
}
