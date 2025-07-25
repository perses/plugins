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

import { ReactElement, useMemo } from 'react';
import { Divider, Link, List, ListItem, ListItemText } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { otlpcommonv1 } from '@perses-dev/core';
import { Span, Trace } from '../trace';
import { formatDuration } from '../utils';

export type AttributeLinks = Record<string, (attributes: Record<string, otlpcommonv1.AnyValue>) => string>;

export interface TraceAttributesProps {
  trace: Trace;
  span: Span;
  attributeLinks?: AttributeLinks;
}

export function TraceAttributes(props: TraceAttributesProps) {
  const { trace, span, attributeLinks } = props;

  return (
    <>
      <List>
        <AttributeItem name="span ID" value={span.spanId} />
        <AttributeItem name="start" value={formatDuration(span.startTimeUnixMs - trace.startTimeUnixMs)} />
        <AttributeItem name="duration" value={formatDuration(span.endTimeUnixMs - span.startTimeUnixMs)} />
      </List>
      <Divider />
      {span.attributes.length > 0 && (
        <>
          <AttributeList
            attributes={span.attributes.toSorted((a, b) => a.key.localeCompare(b.key))}
            attributeLinks={attributeLinks}
          />
          <Divider />
        </>
      )}
      <AttributeList
        attributes={span.resource.attributes.toSorted((a, b) => a.key.localeCompare(b.key))}
        attributeLinks={attributeLinks}
      />
    </>
  );
}

export interface AttributeListProps {
  attributes: otlpcommonv1.KeyValue[];
  attributeLinks?: AttributeLinks;
}

export function AttributeList(props: AttributeListProps): ReactElement {
  const { attributes, attributeLinks } = props;

  return (
    <List>
      <AttributeItems attributes={attributes} attributeLinks={attributeLinks} />
    </List>
  );
}

interface AttributeItemsProps {
  attributeLinks?: AttributeLinks;
  attributes: otlpcommonv1.KeyValue[];
}

export function AttributeItems(props: AttributeItemsProps): ReactElement {
  const { attributeLinks, attributes } = props;
  const attributesMap = useMemo(
    () => Object.fromEntries(attributes.map((attr) => [attr.key, attr.value])),
    [attributes]
  );

  return (
    <>
      {attributes.map((attribute, i) => (
        <AttributeItem
          key={i}
          name={attribute.key}
          value={renderAttributeValue(attribute.value)}
          link={attributeLinks?.[attribute.key]?.(attributesMap)}
        />
      ))}
    </>
  );
}

interface AttributeItemProps {
  name: string;
  value: string;
  link?: string;
}

export function AttributeItem(props: AttributeItemProps): ReactElement {
  const { name, value, link } = props;

  const valueComponent = link ? (
    <Link component={RouterLink} to={link}>
      {value}
    </Link>
  ) : (
    value
  );

  return (
    <ListItem sx={{ px: 1, py: 0 }}>
      <ListItemText
        primary={name}
        secondary={valueComponent}
        slotProps={{
          primary: { variant: 'h5' },
          secondary: { variant: 'body1', sx: { wordBreak: 'break-word' } },
        }}
      />
    </ListItem>
  );
}

function renderAttributeValue(value: otlpcommonv1.AnyValue): string {
  if ('stringValue' in value) return value.stringValue.length > 0 ? value.stringValue : '<empty string>';
  if ('intValue' in value) return value.intValue;
  if ('boolValue' in value) return value.boolValue.toString();
  if ('arrayValue' in value) return value.arrayValue.values.map(renderAttributeValue).join(', ');
  return 'unknown';
}
