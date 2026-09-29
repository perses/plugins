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

import {
  Box,
  Checkbox,
  FormControlLabel,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { createModEnterHandler } from '@perses-dev/dashboards';
import type { DatasourceSelectProps, OptionsEditorProps } from '@perses-dev/plugin-system';
import { DatasourceSelect, isVariableDatasource, useDatasourceSelectValueToSelector } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import type { ReactElement } from 'react';

import type { OpenSearchDatasourceSelector } from '../../model';
import { isDefaultOpenSearchSelector, OPENSEARCH_DATASOURCE_KIND } from '../../model';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE, QUERY_LANGUAGES } from '../constants';
import { useQueryState } from '../query-editor-model';
import type { OpenSearchLogQuerySpec, OpenSearchQueryLanguage } from './opensearch-log-query-types';
import { OPENSEARCH_QUERY_LANGUAGES, requiresIndex, resolveQueryLanguage } from './opensearch-log-query-types';

type OpenSearchQueryEditorProps = OptionsEditorProps<OpenSearchLogQuerySpec>;

// Constant across renders — derived once from the language registry so a fifth
// `_search`-based language only needs a `QUERY_LANGUAGES` entry, not an editor edit.
const REQUIRED_INDEX_MESSAGE = `Required for ${OPENSEARCH_QUERY_LANGUAGES.filter(requiresIndex)
  .map((l) => QUERY_LANGUAGES[l].label)
  .join(' and ')}`;

/**
 * Parses the Limit field's raw text into a spec-safe value: `undefined` for anything empty,
 * non-numeric, or not a positive integer, since the CUE schema constrains `limit` to `int & >0`.
 * Exported (rather than inlined in the change handler) so it can be unit tested directly —
 * a native `<input type="number">` sanitizes invalid strings like `"abc"` or `" 5"` to `""`
 * before a change event ever reaches React, so those inputs can't be exercised through the
 * rendered field itself.
 */
export function parseLimitInput(raw: string): number | undefined {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const labelSx = { display: 'block', marginBottom: '4px', fontWeight: 500 } as const;
const languageInputProps = { 'aria-label': 'Query language' } as const;
const limitInputProps = { min: 1, 'aria-label': 'Limit (optional)' } as const;

const examplesSx = {
  fontSize: '11px',
  color: 'text.secondary',
  backgroundColor: 'action.hover',
  padding: '8px',
  borderRadius: 1,
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.3,
} as const;

export function OpenSearchLogQueryEditor(props: OpenSearchQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const datasourceSelectValue = datasource ?? DEFAULT_DATASOURCE;
  const selectedDatasource = useDatasourceSelectValueToSelector(
    datasourceSelectValue,
    OPENSEARCH_DATASOURCE_KIND,
  ) as OpenSearchDatasourceSelector;

  const { query, handleQueryChange, handleQueryBlur } = useQueryState(props);

  const language = resolveQueryLanguage(value);
  const meta = QUERY_LANGUAGES[language];
  const indexMissing = requiresIndex(language) && !value.index;

  const handleLanguageChange = (next: OpenSearchQueryLanguage): void => {
    onChange(
      produce(value, (draft) => {
        // Carry the live local query text (useQueryState commits on blur) so a switch can never
        // discard an uncommitted edit, regardless of event ordering or when the parent applies
        // onChange. On the normal path this is a no-op: blur has already committed the same value.
        draft.query = query;
        draft.queryLanguage = next;
      }),
    );
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(
      produce(value, (draft) => {
        draft.limit = parseLimitInput(e.target.value);
      }),
    );
  };

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (!isVariableDatasource(newDatasourceSelection) && newDatasourceSelection.kind === DATASOURCE_KIND) {
      onChange(
        produce(value, (draft) => {
          draft.datasource = isDefaultOpenSearchSelector(newDatasourceSelection) ? undefined : newDatasourceSelection;
        }),
      );
      return;
    }
    throw new Error('Got unexpected non OpenSearch datasource selection');
  };

  const handleIndexChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const next = e.target.value;
    onChange(
      produce(value, (draft) => {
        draft.index = next.length > 0 ? next : undefined;
      }),
    );
  };

  const handleStringFieldChange =
    (field: 'timestampField' | 'messageField') =>
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const next = e.target.value;
      onChange(
        produce(value, (draft) => {
          draft[field] = next.length > 0 ? next : undefined;
        }),
      );
    };

  const handleDisableTimeFilterChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const checked = e.target.checked;
    onChange(
      produce(value, (draft) => {
        draft.disableTimeFilter = checked ? true : undefined;
      }),
    );
  };

  // Commit the local query immediately (Mod+Enter), matching the loki/clickhouse editors.
  const handleQueryExecute = (): void => {
    onChange(
      produce(value, (draft) => {
        draft.query = query;
      }),
    );
  };

  return (
    <Stack spacing={1.5} paddingBottom={1}>
      <div>
        <InputLabel id="opensearch-query-language-label" sx={labelSx}>
          Query language
        </InputLabel>
        <Select
          fullWidth
          size="small"
          labelId="opensearch-query-language-label"
          inputProps={languageInputProps}
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as OpenSearchQueryLanguage)}
        >
          {OPENSEARCH_QUERY_LANGUAGES.map((key) => (
            <MenuItem key={key} value={key}>
              {QUERY_LANGUAGES[key].label}
            </MenuItem>
          ))}
        </Select>
      </div>

      <div>
        <InputLabel sx={labelSx}>Datasource</InputLabel>
        <DatasourceSelect
          datasourcePluginKind={DATASOURCE_KIND}
          value={selectedDatasource}
          onChange={handleDatasourceChange}
          label="OpenSearch Datasource"
          notched
        />
      </div>

      <div>
        <InputLabel sx={labelSx}>Index pattern</InputLabel>
        <TextField
          fullWidth
          size="small"
          value={value.index ?? ''}
          onChange={handleIndexChange}
          placeholder="e.g. logs-*"
          error={indexMissing}
          helperText={indexMissing ? REQUIRED_INDEX_MESSAGE : meta.indexHelperText}
        />
      </div>

      <div>
        <InputLabel sx={labelSx}>Timestamp field (optional)</InputLabel>
        <TextField
          fullWidth
          size="small"
          value={value.timestampField ?? ''}
          onChange={handleStringFieldChange('timestampField')}
          placeholder="@timestamp"
        />
      </div>

      <div>
        <InputLabel sx={labelSx}>Message field (optional)</InputLabel>
        <TextField
          fullWidth
          size="small"
          value={value.messageField ?? ''}
          onChange={handleStringFieldChange('messageField')}
          placeholder="message"
        />
      </div>

      <FormControlLabel
        control={
          <Checkbox size="small" checked={value.disableTimeFilter ?? false} onChange={handleDisableTimeFilterChange} />
        }
        label="Disable automatic time filtering"
      />

      {/* `requiresIndex` is true for exactly the `_search`-based languages (lucene/dsl), which
          is also where a result-count limit applies, so it doubles as the gate for this field. */}
      {requiresIndex(language) && (
        <div>
          <InputLabel sx={labelSx}>Limit (optional)</InputLabel>
          <TextField
            fullWidth
            size="small"
            type="number"
            inputProps={limitInputProps}
            value={value.limit ?? ''}
            onChange={handleLimitChange}
            placeholder="500"
            helperText="Maximum number of log documents to fetch."
          />
        </div>
      )}

      <div>
        <InputLabel sx={labelSx}>{`${meta.label} Query`}</InputLabel>
        <TextField
          fullWidth
          multiline
          minRows={3}
          size="small"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onBlur={handleQueryBlur}
          onKeyDown={createModEnterHandler(handleQueryExecute)}
          placeholder={meta.placeholder}
          inputProps={{ style: { fontFamily: 'monospace' } }}
        />
        <Typography variant="caption" sx={{ display: 'block', marginTop: '4px', color: 'text.secondary' }}>
          Uses OpenSearch{' '}
          <Link href={meta.docsUrl} target="_blank" rel="noopener noreferrer">
            {meta.docsLabel}
          </Link>
          . {meta.usageNote}
        </Typography>
      </div>

      <details>
        <Box
          component="summary"
          sx={{ cursor: 'pointer', fontSize: '12px', color: 'text.secondary', marginBottom: '8px' }}
        >
          Query Examples
        </Box>
        <Box sx={examplesSx}>{meta.examples}</Box>
      </details>
    </Stack>
  );
}
