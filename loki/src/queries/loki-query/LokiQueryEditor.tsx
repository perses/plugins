import { DatasourceSelect, DatasourceSelectProps, isVariableDatasource, OptionsEditorProps, useDatasourceClient, useDatasourceSelectValueToSelector } from '@perses-dev/plugin-system';
import { ReactElement, useCallback, useRef, useState, useEffect } from 'react';
import { LokiQuerySpec } from './loki-query-types';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from './constants';
import { CodeMirrorLogQLEditor } from '../../components/codemirror-logql-editor';
import { LOKI_DATASOURCE_KIND, LokiClient, LokiDatasourceSelector } from '../../model';

type LokiQueryEditorProps = OptionsEditorProps<LokiQuerySpec>;

export function LokiQueryEditor(props: LokiQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const datasourceSelectValue = datasource ?? DEFAULT_DATASOURCE;
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectedDatasource = useDatasourceSelectValueToSelector(
    datasourceSelectValue,
    LOKI_DATASOURCE_KIND
  ) as LokiDatasourceSelector;

  const { data: client } = useDatasourceClient<LokiClient>(selectedDatasource);
  const lokiURL = client?.options.datasourceUrl;

  // Local state for editor value to prevent query_range calls on every keystroke
  const [localQuery, setLocalQuery] = useState(value.query);

  // Update local state when prop changes
  useEffect(() => {
    setLocalQuery(value.query);
  }, [value.query]);

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (!isVariableDatasource(newDatasourceSelection) && newDatasourceSelection.kind === DATASOURCE_KIND) {
      onChange({ ...value, datasource: newDatasourceSelection });
      return;
    }

    throw new Error('Got unexpected non LokiQuery datasource selection');
  };

  // Debounced query change handler to prevent excessive query_range calls
  const handleQueryChange = useCallback((newQuery: string) => {
    console.log('🔍 LokiQueryEditor: Query change called, updating local state only');
    // Update local state immediately for editor responsiveness
    setLocalQuery(newQuery);
    // Do NOT update the parent query to prevent excessive API calls
  }, []);

  // Immediate query execution on Enter or blur
  const handleQueryExecute = useCallback((query: string) => {
    console.log('🔍 LokiQueryEditor: Query execute called, updating parent value:', query);
    // Clear any pending debounced update
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Update the parent component state (this will trigger query execution)
    onChange({ ...value, query });
  }, [onChange, value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
          Datasource
        </label>
        <DatasourceSelect
          datasourcePluginKind={DATASOURCE_KIND}
          value={selectedDatasource}
          onChange={handleDatasourceChange}
          label="Loki Datasource"
          notched
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
          LogQL Query
        </label>
        <CodeMirrorLogQLEditor
          value={localQuery}
          onChange={handleQueryChange}
          onBlur={() => handleQueryExecute(localQuery)}
          onEnter={handleQueryExecute}
          placeholder='Enter LogQL query (e.g. {job="mysql"} |= "error")'
          height={120}
          lokiURL={lokiURL}
          timeRange={(props as any).context?.timeRange}
        />
      </div>
    </div>
  );
}
