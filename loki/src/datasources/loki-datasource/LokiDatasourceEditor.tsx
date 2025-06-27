import { HTTPSettingsEditor } from '@perses-dev/plugin-system';
import { ReactElement } from 'react';
import { LokiDatasourceSpec } from './loki-datasource-types';

export interface LokiDatasourceEditorProps {
  value: LokiDatasourceSpec;
  onChange: (next: LokiDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function LokiDatasourceEditor(props: LokiDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const initialSpecDirect: LokiDatasourceSpec = {
    directUrl: '',
  };

  const initialSpecProxy: LokiDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          {
            endpointPattern: '/loki/api/v1/query',
            method: 'POST',
          },
          {
            endpointPattern: '/loki/api/v1/query_range',
            method: 'POST',
          },
          {
            endpointPattern: '/loki/api/v1/labels',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/label/([a-zA-Z0-9_-]+)/values',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/series',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/index/volume',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/index/volume_range',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/index/stats',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/tail',
            method: 'GET',
          },
        ],
        url: '',
      },
    },
  };

  return (
    <HTTPSettingsEditor
      value={value}
      onChange={onChange}
      isReadonly={isReadonly}
      initialSpecDirect={initialSpecDirect}
      initialSpecProxy={initialSpecProxy}
    />
  );
}
