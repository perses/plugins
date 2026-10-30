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

import { Link, Stack, Switch, TextField } from '@mui/material';
import { OptionsEditorControl } from '@perses-dev/components';
import type { OptionsEditorProps } from '@perses-dev/plugin-system';
import type { ChangeEvent, ReactElement } from 'react';

import type { MarkdownPanelOptions } from './markdown-panel-model';

export type MarkdownPanelOptionsEditorProps = OptionsEditorProps<MarkdownPanelOptions>;

const MARKDOWN_GUIDE_URL = 'https://commonmark.org/help/';
const TEXT_INPUT_NUM_ROWS = 20;

export function MarkdownPanelOptionsEditor(props: MarkdownPanelOptionsEditorProps): ReactElement {
  const { onChange, value } = props;

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange({ ...value, text: e.target.value });
  };

  const handleEnableHtmlChange = (_: ChangeEvent, checked: boolean): void => {
    onChange({ ...value, enableHtml: checked });
  };

  return (
    <Stack spacing={1}>
      <Link sx={{ alignSelf: 'end', textDecoration: 'none' }} href={MARKDOWN_GUIDE_URL} target="_blank" rel="noopener">
        Markdown Guide
      </Link>
      <TextField
        label="Text"
        // Multiline
        multiline
        rows={TEXT_INPUT_NUM_ROWS}
        // Value
        value={value.text}
        onChange={handleTextChange}
      />
      <OptionsEditorControl
        label="Enable HTML"
        description="Render raw HTML tags found in the text. When disabled, HTML is displayed as plain text."
        control={<Switch checked={!!value.enableHtml} onChange={handleEnableHtmlChange} />}
      />
    </Stack>
  );
}
