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

import { ReactElement, useMemo } from 'react';
import { useTheme } from '@mui/material';
import CodeMirror, { EditorView, ReactCodeMirrorProps } from '@uiw/react-codemirror';
import { LogsQLExtension } from './logsql-extension';

export type LogsQLEditorProps = Omit<ReactCodeMirrorProps, 'theme' | 'extensions'>;

export function LogsQLEditor(props: LogsQLEditorProps): ReactElement {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const logsqlExtension = useMemo(() => {
    return LogsQLExtension();
  }, []);

  const codemirrorTheme = useMemo(() => {
    const borderColor = theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)';

    return EditorView.theme({
      '&': {
        backgroundColor: 'transparent !important', // required for dark mode
        border: `1px solid ${borderColor}`,
        borderRadius: `${theme.shape.borderRadius}px`,
      },
      '&.cm-focused.cm-editor': {
        outline: 'none',
      },
      '.cm-content': {
        padding: '8px',
      },
    });
  }, [theme]);

  return (
    <CodeMirror
      {...props}
      theme={isDarkMode ? 'dark' : 'light'}
      basicSetup={{
        lineNumbers: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        foldGutter: false,
        syntaxHighlighting: true,
      }}
      extensions={[EditorView.lineWrapping, logsqlExtension, codemirrorTheme]}
      placeholder='Example: {job="my-service"} |= "error"'
    />
  );
}
