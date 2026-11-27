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
import { useTheme, InputLabel, Stack } from '@mui/material';
import type { ReactCodeMirrorProps } from '@uiw/react-codemirror';
import CodeMirror from '@uiw/react-codemirror';
import type { ReactElement } from 'react';
import { useMemo } from 'react';

export type ClickQLEditorProps = Omit<ReactCodeMirrorProps, 'theme' | 'extensions'> & {
  /** Label displayed above the editor. */
  label?: string;
};

const BASIC_SETUP: ReactCodeMirrorProps['basicSetup'] = {
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
  foldGutter: false,
  syntaxHighlighting: true,
};

const EXTENSIONS = [
  EditorView.lineWrapping,
  EditorView.theme({
    '.cm-content': {
      paddingTop: '8px',
      paddingBottom: '8px',
      paddingRight: '40px',
    },
  }),
];

export function ClickQLEditor(props: ClickQLEditorProps): ReactElement {
  const { label = 'ClickHouse Query', ...editorProps } = props;
  const theme = useTheme();
  // The editor is reconfigured each time its extensions change: keep them stable.
  const extensions = useMemo(() => [...EXTENSIONS, EditorView.contentAttributes.of({ 'aria-label': label })], [label]);

  return (
    <Stack position="relative">
      <InputLabel
        sx={{
          fontWeight: 500,
          marginBottom: '4px',
          color: theme.palette.text.primary,
        }}
      >
        {label}
      </InputLabel>
      <CodeMirror
        placeholder="Write ClickHouse Query Here..."
        {...editorProps}
        style={{ border: `1px solid ${theme.palette.divider}` }}
        theme={theme.palette.mode === 'dark' ? 'dark' : 'light'}
        basicSetup={BASIC_SETUP}
        extensions={extensions}
      />
    </Stack>
  );
}
