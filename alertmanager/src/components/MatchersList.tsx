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

import { Chip, Stack } from '@mui/material';
import { SilenceMatcher } from '@perses-dev/spec';
import { ReactElement } from 'react';

export interface MatchersListProps {
  matchers: SilenceMatcher[];
}

function formatMatcher(matcher: SilenceMatcher): string {
  let operator: string;
  if (matcher.isRegex) {
    operator = (matcher.isEqual ?? true) ? '=~' : '!~';
  } else {
    operator = (matcher.isEqual ?? true) ? '=' : '!=';
  }
  return `${matcher.name}${operator}"${matcher.value}"`;
}

/**
 * Renders a list of matchers as MUI Chips.
 */
export function MatchersList({ matchers }: MatchersListProps): ReactElement {
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {matchers.map((matcher, index) => (
        <Chip key={index} label={formatMatcher(matcher)} size="small" variant="outlined" />
      ))}
    </Stack>
  );
}
