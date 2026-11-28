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

import type { Theme } from '@mui/material';
import { Chip, Stack, useTheme } from '@mui/material';
import type { ReactElement } from 'react';

import type { ColumnSettings } from '../models';
import type { ResolvedTag } from '../models/tag-colors';

export interface TagsCellProps {
  tags: ResolvedTag[];
  align?: ColumnSettings['align'];
}

// The maximum height of a chip, in pixels. This is used to ensure that the chip does not exceed the height of the table row.
const CHIP_MAX_HEIGHT = 24;

const JUSTIFY_CONTENT: Record<NonNullable<ColumnSettings['align']>, string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

/**
 * Returns a readable text color for the given background.
 * Falls back to the theme text color for colors MUI cannot parse (e.g. hex without '#'), instead of throwing.
 */
function getTagTextColor(theme: Theme, backgroundColor: string): string {
  try {
    return theme.palette.getContrastText(backgroundColor);
  } catch {
    return theme.palette.text.primary;
  }
}

/**
 * Returns a key per tag that does not depend on its position: the label and its occurrence among tags with the same
 * label (a value can contain the same tag several times, and different values can have the same label).
 */
function withTagKeys(tags: ResolvedTag[]): Array<{ key: string; tag: ResolvedTag }> {
  const occurrences = new Map<string, number>();
  return tags.map((tag) => {
    const occurrence = occurrences.get(tag.label) ?? 0;
    occurrences.set(tag.label, occurrence + 1);
    return { key: `${tag.label}#${occurrence}`, tag };
  });
}

/**
 * Renders the tags of a table cell as colored chips.
 */
export function TagsCell({ tags, align }: TagsCellProps): ReactElement {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      gap={0.5}
      flexWrap="nowrap"
      overflow="hidden"
      height="100%"
      alignItems="center"
      justifyContent={JUSTIFY_CONTENT[align ?? 'left']}
      data-testid="table-tags"
    >
      {withTagKeys(tags).map(({ key, tag }) => (
        <Chip
          key={key}
          size="small"
          label={tag.label}
          data-testid="table-tag"
          sx={{
            height: '100%',
            maxHeight: CHIP_MAX_HEIGHT,
            backgroundColor: tag.backgroundColor,
            color: tag.textColor ?? getTagTextColor(theme, tag.backgroundColor),
          }}
        />
      ))}
    </Stack>
  );
}
