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

import { IconButton, InputAdornment, Stack, TextField } from '@mui/material';
import ChevronUp from 'mdi-material-ui/ChevronUp';
import ChevronDown from 'mdi-material-ui/ChevronDown';
import Close from 'mdi-material-ui/Close';
import { ReactElement, useCallback, useMemo, useState } from 'react';
import { otlpcommonv1 } from '@perses-dev/core';
import { renderAttributeValue } from './DetailPane/Attributes';
import { Span, Trace, forEachSpan } from './trace';

export interface SearchBarProps {
  search: SpanSearch;
}

export function SearchBar(props: SearchBarProps): ReactElement {
  const { search } = props;
  const { searchQuery, setSearchQuery, matchingSpanIds, focusedMatchIndex, setFocusedMatchIndex } = search;

  const hasQuery = searchQuery.length > 0;
  const matchCount = matchingSpanIds.length;
  const hasMatches = matchCount > 0;

  function handlePrev(): void {
    if (!hasMatches) return;
    setFocusedMatchIndex((focusedMatchIndex - 1 + matchCount) % matchCount);
  }

  function handleNext(): void {
    if (!hasMatches) return;
    setFocusedMatchIndex((focusedMatchIndex + 1) % matchCount);
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  }

  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, minWidth: 300 }}>
      <TextField
        size="small"
        placeholder="Search spans..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end" sx={{ visibility: hasQuery ? 'visible' : 'hidden', whiteSpace: 'nowrap' }}>
                {hasMatches ? `${focusedMatchIndex + 1}/${matchCount}` : '0/0'}
              </InputAdornment>
            ),
          },
        }}
        sx={{ minWidth: 200 }}
      />
      <IconButton size="small" disabled={!hasMatches} aria-label="Previous match" onClick={handlePrev}>
        <ChevronUp />
      </IconButton>
      <IconButton size="small" disabled={!hasMatches} aria-label="Next match" onClick={handleNext}>
        <ChevronDown />
      </IconButton>
      <IconButton size="small" disabled={!hasQuery} aria-label="Clear search" onClick={() => setSearchQuery('')}>
        <Close />
      </IconButton>
    </Stack>
  );
}

function spanMatchesQuery(span: Span, query: string): boolean {
  const attrMatches = (attr: otlpcommonv1.KeyValue): boolean =>
    attr.key.toLowerCase().includes(query) || renderAttributeValue(attr.value).toLowerCase().includes(query);

  return (
    span.resource.serviceName?.toLowerCase().includes(query) ||
    span.name.toLowerCase().includes(query) ||
    span.spanId.toLowerCase().includes(query) ||
    span.attributes.some(attrMatches) ||
    span.resource.attributes.some(attrMatches)
  );
}

export interface SpanSearch {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  matchingSpanIds: string[];
  focusedMatchIndex: number;
  setFocusedMatchIndex: (index: number) => void;
}

export function useSpanSearch(trace: Trace): SpanSearch {
  const [searchQuery, setSearchQueryRaw] = useState('');
  const [focusedMatchIndex, setFocusedMatchIndex] = useState(0);

  const matchingSpanIds = useMemo(() => {
    if (searchQuery.length === 0) return [];

    const query = searchQuery.toLowerCase();
    const matches: string[] = [];
    forEachSpan(trace.rootSpans, (span) => {
      if (spanMatchesQuery(span, query)) {
        matches.push(span.spanId);
      }
    });
    return matches;
  }, [searchQuery, trace.rootSpans]);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryRaw(query);
    setFocusedMatchIndex(0);
  }, []);

  return { searchQuery, setSearchQuery, matchingSpanIds, focusedMatchIndex, setFocusedMatchIndex };
}
