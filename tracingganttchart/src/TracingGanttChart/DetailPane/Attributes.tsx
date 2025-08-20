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
import { otlpcommonv1 } from '@perses-dev/core';
import { RouterContextType, useAllVariableValues, useRouterContext } from '@perses-dev/plugin-system';
import { Span, Trace } from '../trace';
import { formatDuration, renderTemplate } from '../utils';
import { CustomLinks } from '../../gantt-chart-model';

export interface TraceAttributesProps {
  customLinks?: CustomLinks;
  trace: Trace;
  span: Span;
}

export function TraceAttributes(props: TraceAttributesProps) {
  const { customLinks, trace, span } = props;

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
            customLinks={customLinks}
            attributes={span.attributes.toSorted((a, b) => a.key.localeCompare(b.key))}
          />
          <Divider />
        </>
      )}
      <AttributeList
        customLinks={customLinks}
        attributes={span.resource.attributes.toSorted((a, b) => a.key.localeCompare(b.key))}
      />
    </>
  );
}

export interface AttributeListProps {
  customLinks?: CustomLinks;
  attributes: otlpcommonv1.KeyValue[];
}

export function AttributeList(props: AttributeListProps): ReactElement {
  const { customLinks, attributes } = props;

  return (
    <List>
      <AttributeItems customLinks={customLinks} attributes={attributes} />
    </List>
  );
}

interface AttributeItemsProps {
  customLinks?: CustomLinks;
  attributes: otlpcommonv1.KeyValue[];
}

export function AttributeItems(props: AttributeItemsProps): ReactElement {
  const { customLinks, attributes } = props;
  const variableValues = useAllVariableValues();

  // turn array into map for fast access
  const attributeLinks = useMemo(() => {
    const attrs = (customLinks?.links.attributes ?? []).map((a) => [a.name, a.link]);
    return Object.fromEntries(attrs);
  }, [customLinks]);

  // some links require access to other attributes, for example a pod link "/namespace/${k8s_namespace_name}/pod/${k8s_pod_name}"
  const extraVariables = useMemo(() => {
    // replace dot with underscore in attribute name, because dot is not allowed in variable names
    const stringAttrs = attributes.map((attr) => [attr.key.replaceAll('.', '_'), renderAttributeValue(attr.value)]);

    return {
      ...customLinks?.variables,
      ...Object.fromEntries(stringAttrs),
    };
  }, [customLinks, attributes]);

  return (
    <>
      {attributes.map((attribute, i) => (
        <AttributeItem
          key={i}
          name={attribute.key}
          value={renderAttributeValue(attribute.value)}
          link={renderTemplate(attributeLinks[attribute.key], variableValues, extraVariables)}
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
  // Remove the casting once https://github.com/perses/perses/pull/3208 is merged
  const { RouterComponent } = useRouterContext() as { RouterComponent?: RouterContextType['RouterComponent'] };

  const valueComponent =
    RouterComponent && link ? (
      <Link component={RouterComponent} to={link}>
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
