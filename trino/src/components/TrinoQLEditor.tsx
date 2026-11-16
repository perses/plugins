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

import { EditorView } from '@codemirror/view';
import { useTheme, InputLabel, Stack, Button, Box, FormHelperText } from '@mui/material';
import type { ReactCodeMirrorProps } from '@uiw/react-codemirror';
import CodeMirror from '@uiw/react-codemirror';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { formatDialect, trino } from 'sql-formatter';

export type TrinoQLEditorProps = Omit<ReactCodeMirrorProps, 'theme' | 'extensions'> & {
  /** Called with the formatted query so the caller can commit it to the spec. */
  onFormat?: (query: string) => void;
};

// Treat Perses variables ($var, ${var}, ${var:format}) as parameters so the formatter keeps them intact.
const PERSES_VARIABLE = { custom: [{ regex: String.raw`\$\{[^}]+\}|\$\w+` }] };

/** formatTrinoQuery pretty-prints Trino SQL without altering Perses variables. It throws on SQL it cannot parse. */
export function formatTrinoQuery(query: string): string {
  return formatDialect(query, { dialect: trino, paramTypes: PERSES_VARIABLE });
}

export function TrinoQLEditor(props: TrinoQLEditorProps): ReactElement {
  const { onFormat, ...editorProps } = props;
  const [formatError, setFormatError] = useState<string>();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const formatQuery = (): void => {
    if (!props.value) return;
    try {
      const formatted = formatTrinoQuery(props.value);
      setFormatError(undefined);
      props.onChange?.(formatted, undefined as never);
      onFormat?.(formatted);
    } catch (e) {
      setFormatError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Stack position="relative">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <InputLabel
          sx={{
            fontWeight: 500,
            marginBottom: '4px',
            color: theme.palette.text.primary,
          }}
        >
          Trino Query
        </InputLabel>
        <Button variant="text" size="small" onClick={formatQuery}>
          Format Query
        </Button>
      </Box>
      <CodeMirror
        {...editorProps}
        style={{ border: `1px solid ${theme.palette.divider}` }}
        theme={isDarkMode ? 'dark' : 'light'}
        basicSetup={{
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          foldGutter: false,
          syntaxHighlighting: true,
        }}
        extensions={[
          EditorView.lineWrapping,
          EditorView.theme({
            '.cm-content': {
              paddingTop: '8px',
              paddingBottom: '8px',
              paddingRight: '40px',
            },
          }),
        ]}
        placeholder="Write Trino Query Here..."
      />
      {formatError && <FormHelperText error>Could not format query: {formatError}</FormHelperText>}
    </Stack>
  );
}
