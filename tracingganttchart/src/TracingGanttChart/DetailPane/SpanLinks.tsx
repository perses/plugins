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

import { Divider, List } from '@mui/material';
import { Fragment, ReactElement } from 'react';
import { useAllVariableValues } from '@perses-dev/plugin-system';
import { Span, Link } from '../trace';
import { CustomLinks } from '../../gantt-chart-model';
import { renderTemplate } from '../utils';
import { AttributeItem, AttributeItems } from './Attributes';

export interface SpanLinkListProps {
  customLinks?: CustomLinks;
  span: Span;
}

export function SpanLinkList(props: SpanLinkListProps): ReactElement {
  const { customLinks, span } = props;

  return (
    <>
      {span.links.map((link, i) => (
        <Fragment key={i}>
          {i > 0 && <Divider />}
          <SpanLinkItem link={link} customLinks={customLinks} />
        </Fragment>
      ))}
    </>
  );
}

interface SpanLinkItemProps {
  customLinks?: CustomLinks;
  link: Link;
}

function SpanLinkItem(props: SpanLinkItemProps): ReactElement {
  const { customLinks, link } = props;
  const variableValues = useAllVariableValues();
  const spanLink = renderTemplate(customLinks?.links.trace, variableValues, {
    ...customLinks?.variables,
    traceId: link.traceId,
    spanId: link.spanId,
  });

  return (
    <List>
      <AttributeItem name="trace ID" value={link.traceId} link={spanLink} />
      <AttributeItem name="span ID" value={link.spanId} link={spanLink} />
      <AttributeItems customLinks={customLinks} attributes={link.attributes} />
    </List>
  );
}
