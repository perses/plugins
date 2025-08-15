import {
  DatasourceSelect,
  DatasourceSelectProps,
  isVariableDatasource,
  OptionsEditorProps,
} from '@perses-dev/plugin-system';
import { ReactElement, useCallback, useEffect, useState } from 'react';
import { ClickHouseTimeSeriesQuerySpec } from './click-house-query-types';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from './constants';
import { ClickQLEditor } from '../../components';
import { Stack } from '@mui/material';
import { queryExample } from '../../components/constants';

type ClickHouseTimeSeriesQueryEditorProps = OptionsEditorProps<ClickHouseTimeSeriesQuerySpec>;

export function ClickHouseTimeSeriesQueryEditor(props: ClickHouseTimeSeriesQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const selectedDatasource = datasource ?? DEFAULT_DATASOURCE;
  const [localQuery, setLocalQuery] = useState(value.query || '');

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (!isVariableDatasource(newDatasourceSelection) && newDatasourceSelection.kind === DATASOURCE_KIND) {
      onChange({ ...value, datasource: newDatasourceSelection });
      return;
    }
    throw new Error('Got unexpected non ClickHouse datasource selection');
  };

  const handleQueryChange = useCallback((newQuery: string) => {
    setLocalQuery(newQuery);
  }, []);

  const handleQueryExecute = useCallback(
    (query: string) => {
      onChange({ ...value, query });
    },
    [onChange, value]
  );

  useEffect(() => {
    setLocalQuery(value.query || '');
  }, [value.query]);

  const examplesStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#777',
    backgroundColor: '#f5f5f5',
    padding: '8px',
    borderRadius: '4px',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.3',
  };

  return (
    <Stack spacing={1.5}>
      <DatasourceSelect
        datasourcePluginKind={DATASOURCE_KIND}
        value={selectedDatasource}
        onChange={handleDatasourceChange}
        label="ClickHouse Datasource"
        notched
      />
      <ClickQLEditor
        value={localQuery}
        onChange={handleQueryChange}
        onBlur={() => handleQueryExecute(localQuery)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            handleQueryExecute(localQuery);
          }
        }}
        placeholder="Enter ClickHouse SQL query"
      />

      <details>
        <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          Query Examples
        </summary>
        <div style={examplesStyle}>{queryExample}</div>
      </details>
    </Stack>
  );
}
