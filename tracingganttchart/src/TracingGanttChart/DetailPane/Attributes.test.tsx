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
import { otlpcommonv1, otlptracev1 } from '@perses-dev/core';
import * as exampleTrace from '../../test/traces/example_otlp.json';
import { getTraceModel } from '../trace';
import { AttributeLinks, AttributeList, AttributeListProps, TraceAttributes, TraceAttributesProps } from './Attributes';

describe('Attributes', () => {
  const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);
  const renderTraceAttributes = (props: TraceAttributesProps): RenderResult => {
    return render(
      <MemoryRouter>
        <TraceAttributes {...props} />
      </MemoryRouter>
    );
  };

  const renderAttributeList = (props: AttributeListProps): RenderResult => {
    return render(
      <MemoryRouter>
        <AttributeList {...props} />
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

  it('render an attribute with a link', () => {
    const stringValue = (val?: otlpcommonv1.AnyValue): string => (val && 'stringValue' in val ? val.stringValue : '');
    const attributeLinks: AttributeLinks = {
      'k8s.pod.name': (attrs) =>
        `/console/ns/${stringValue(attrs['k8s.namespace.name'])}/pod/${stringValue(attrs['k8s.pod.name'])}/detail`,
    };
    const attributes = [
      { key: 'k8s.namespace.name', value: { stringValue: 'testing' } },
      { key: 'k8s.pod.name', value: { stringValue: 'hotrod' } },
    ];

    renderAttributeList({ attributeLinks, attributes });
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
