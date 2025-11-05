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

import { render, RenderResult } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { otlptracev1 } from '@perses-dev/core';
import { VariableProvider } from '@perses-dev/dashboards';
import { ReactRouterProvider, TimeRangeProvider } from '@perses-dev/plugin-system';
import * as exampleTrace from '../../test/traces/example_otlp.json';
import { getTraceModel } from '../trace';
import { CustomLinks } from '../../gantt-chart-model';
import { AttributeList, AttributeListProps, TraceAttributes, TraceAttributesProps } from './Attributes';

describe('Attributes', () => {
  const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);
  const renderTraceAttributes = (props: TraceAttributesProps): RenderResult => {
    return render(
      <MemoryRouter>
        <ReactRouterProvider>
          <TimeRangeProvider timeRange={{ pastDuration: '1m' }}>
            <VariableProvider>
              <TraceAttributes {...props} />
            </VariableProvider>
          </TimeRangeProvider>
        </ReactRouterProvider>
      </MemoryRouter>
    );
  };

  const renderAttributeList = (props: AttributeListProps): RenderResult => {
    return render(
      <MemoryRouter>
        <ReactRouterProvider>
          <TimeRangeProvider timeRange={{ pastDuration: '1m' }}>
            <VariableProvider>
              <AttributeList {...props} />
            </VariableProvider>
          </TimeRangeProvider>
        </ReactRouterProvider>
      </MemoryRouter>
    );
  };

  it('render stringValues', () => {
    const attributes = [{ key: 'attrkey', value: { stringValue: 'str' } }];
    renderAttributeList({ attributes });
    expect(screen.getByText('attrkey')).toBeInTheDocument();
    expect(screen.getByText('str')).toBeInTheDocument();
  });

  it('render intValue', () => {
    const attributes = [{ key: 'attrkey', value: { intValue: '123' } }];
    renderAttributeList({ attributes });
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('render doubleValue', () => {
    const attributes = [{ key: 'attrkey', value: { doubleValue: 1.1 } }];
    renderAttributeList({ attributes });
    expect(screen.getByText('1.1')).toBeInTheDocument();
  });

  it('render boolValue', () => {
    const attributes = [{ key: 'attrkey', value: { boolValue: false } }];
    renderAttributeList({ attributes });
    expect(screen.getByText('false')).toBeInTheDocument();
  });

  it('render arrayValue', () => {
    const attributes = [
      { key: 'attrkey', value: { arrayValue: { values: [{ stringValue: 'abc' }, { boolValue: true }] } } },
    ];
    renderAttributeList({ attributes });
    expect(screen.getByText('abc, true')).toBeInTheDocument();
  });

  it('render empty array', () => {
    const attributes = [{ key: 'attrkey', value: { arrayValue: {} } }];
    renderAttributeList({ attributes });
    expect(screen.getByText('<empty array>')).toBeInTheDocument();
  });

  it('render an attribute with a link', () => {
    const customLinks: CustomLinks = {
      links: {
        attributes: [{ name: 'k8s.pod.name', link: '/console/ns/${k8s_namespace_name}/pod/${k8s_pod_name}/detail' }],
      },
      variables: {},
    };
    const attributes = [
      { key: 'k8s.namespace.name', value: { stringValue: 'testing' } },
      { key: 'k8s.pod.name', value: { stringValue: 'hotrod' } },
    ];

    renderAttributeList({ customLinks, attributes });
    expect(screen.getByText('testing')).not.toHaveAttribute('href');
    expect(screen.getByRole('link', { name: 'hotrod' })).toHaveAttribute(
      'href',
      '/console/ns/testing/pod/hotrod/detail'
    );
  });

  it('render span id and duration', () => {
    renderTraceAttributes({ trace, span: trace.rootSpans[0]!.childSpans[0]!.childSpans[0]! });
    expect(screen.getByText('sid3')).toBeInTheDocument();
    expect(screen.getByText('300ms')).toBeInTheDocument(); // start
    expect(screen.getByText('150ms')).toBeInTheDocument(); // duration
  });
});
