// Copyright 2024 The Perses Authors
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
import { Fragment, ReactElement, useState } from 'react';
import ChevronUp from 'mdi-material-ui/ChevronUp';
import ChevronDown from 'mdi-material-ui/ChevronDown';
import { formatDuration } from '../utils';
import { Trace, Span, Event } from '../trace';
import { AttributeItems, AttributeItem, AttributeLinks } from './Attributes';

export interface SpanEventListProps {
  trace: Trace;
  span: Span;
  attributeLinks?: AttributeLinks;
}

export function SpanEventList(props: SpanEventListProps): ReactElement {
  const { trace, span, attributeLinks } = props;

  return (
    <>
      {span.events
        .sort((a, b) => a.timeUnixMs - b.timeUnixMs)
        .map((event, i) => (
          <Fragment key={i}>
            {i > 0 && <Divider />}
            <SpanEventItem trace={trace} event={event} attributeLinks={attributeLinks} />
          </Fragment>
        ))}
    </>
  );
}

interface SpanEventItemProps {
  trace: Trace;
  event: Event;
  attributeLinks?: AttributeLinks;
}

function SpanEventItem(props: SpanEventItemProps): ReactElement {
  const { trace, event, attributeLinks } = props;
  const relativeTime = event.timeUnixMs - trace.startTimeUnixMs;

  const [open, setOpen] = useState(false);
  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <List>
      <ListItemButton onClick={handleClick} sx={{ px: 1 }}>
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
          <AttributeItems attributes={event.attributes} attributeLinks={attributeLinks} />
        </List>
      </Collapse>
    </List>
  );
}
