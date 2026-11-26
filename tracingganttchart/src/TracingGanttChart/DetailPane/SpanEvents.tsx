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

import { Collapse, Divider, List, ListItemButton, ListItemText } from '@mui/material';
import ChevronDown from 'mdi-material-ui/ChevronDown';
import ChevronUp from 'mdi-material-ui/ChevronUp';
import type { ReactElement } from 'react';
import { Fragment, useEffect, useRef, useState } from 'react';

import type { CustomLinks } from '../../gantt-chart-model';
import type { Trace, Span, Event } from '../trace';
import { formatDuration } from '../utils';
import { AttributeItems, AttributeItem } from './Attributes';

/**
 * FocusedSpanEvent references an event to open and scroll into view.
 * A new object is created on each request, to focus the same event again.
 */
export interface FocusedSpanEvent {
  spanId: string;
  /** index of the event in `span.events` */
  eventIndex: number;
}

export interface SpanEventListProps {
  customLinks?: CustomLinks;
  trace: Trace;
  span: Span;
  focusedEvent?: FocusedSpanEvent;
}

export function SpanEventList(props: SpanEventListProps): ReactElement {
  const { customLinks, trace, span, focusedEvent } = props;

  return (
    <>
      {span.events
        .map((event, index) => ({ event, index }))
        .toSorted((a, b) => a.event.timeUnixMs - b.event.timeUnixMs)
        .map(({ event, index }, i) => (
          <Fragment key={index}>
            {i > 0 && <Divider />}
            <SpanEventItem
              customLinks={customLinks}
              trace={trace}
              event={event}
              focus={
                focusedEvent?.spanId === span.spanId && focusedEvent.eventIndex === index ? focusedEvent : undefined
              }
            />
          </Fragment>
        ))}
    </>
  );
}

interface SpanEventItemProps {
  customLinks?: CustomLinks;
  trace: Trace;
  event: Event;
  /** set if this event is focused */
  focus?: FocusedSpanEvent;
}

function SpanEventItem(props: SpanEventItemProps): ReactElement {
  const { customLinks, trace, event, focus } = props;
  const relativeTime = event.timeUnixMs - trace.startTimeUnixMs;
  const ref = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(focus !== undefined);
  const handleClick = (): void => {
    setOpen(!open);
  };

  // expand the event when it gets focused
  const [prevFocus, setPrevFocus] = useState(focus);
  if (focus !== prevFocus) {
    setPrevFocus(focus);
    if (focus) {
      setOpen(true);
    }
  }

  useEffect(() => {
    if (focus) {
      ref.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [focus]);

  return (
    <List ref={ref}>
      <ListItemButton selected={focus !== undefined} onClick={handleClick} sx={{ px: 1 }}>
        <ListItemText
          primary={
            <>
              <strong>{formatDuration(relativeTime)}:</strong> {event.name}
            </>
          }
          slotProps={{ primary: { noWrap: true } }}
        />
        {open ? <ChevronUp /> : <ChevronDown />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List sx={{ px: 1 }}>
          <AttributeItem name="name" value={event.name} />
          <AttributeItem name="time" value={formatDuration(relativeTime)} />
          <AttributeItems customLinks={customLinks} attributes={event.attributes} />
        </List>
      </Collapse>
    </List>
  );
}
