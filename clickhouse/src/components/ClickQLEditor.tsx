// Copyright 2025 The Perses Authors
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

import CodeMirror, { ReactCodeMirrorProps } from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { useTheme, InputLabel, Stack } from '@mui/material';
import { ReactElement } from 'react';

export type ClickQLEditorProps = Omit<ReactCodeMirrorProps, 'theme' | 'extensions'>;

export function ClickQLEditor(props: ClickQLEditorProps): ReactElement {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Stack position="relative">
      <InputLabel
        sx={{
          fontWeight: 500,
          marginBottom: '4px',
          color: theme.palette.text.primary,
        }}
      >
        ClickHouse Query
      </InputLabel>
      <CodeMirror
        {...props}
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
        placeholder="Write ClickHouse Query Here..."
      />
    </Stack>
  );
}
