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

import { QueryParamValues } from '@perses-dev/components';
import { BuiltinVariableDefinition, RequestHeaders } from '@perses-dev/core';
import { DatasourcePlugin } from '@perses-dev/plugin-system';
import {
  ClientRequestOptions,
  healthCheck,
  instantQuery,
  labelNames,
  labelValues,
  mergeQueryParams,
  metricMetadata,
  parseQuery,
  PrometheusClient,
  QueryOptions,
  rangeQuery,
  series,
} from '../model';
import { PrometheusDatasourceEditor } from './PrometheusDatasourceEditor';
import { PrometheusDatasourceSpec } from './types';

function wrapClientMethod<P, R>(
  fn: (params: P, opts: QueryOptions) => Promise<R>,
  datasourceUrl: string,
  specHeaders?: RequestHeaders,
  specQueryParams?: QueryParamValues
): (params: P, options?: ClientRequestOptions) => Promise<R> {
  return (params: P, options?: ClientRequestOptions) =>
    fn(params, {
      datasourceUrl,
      headers: options?.headers ?? specHeaders,
      signal: options?.signal,
      queryParams: mergeQueryParams(specQueryParams, options?.queryParams),
    });
}

/**
 * Creates a PrometheusClient for a specific datasource spec.
 */
const createClient: DatasourcePlugin<PrometheusDatasourceSpec, PrometheusClient>['createClient'] = (spec, options) => {
  const { directUrl, proxy, queryParams } = spec;
  const { proxyUrl } = options;

  // Use the direct URL if specified, but fallback to the proxyUrl by default if not specified
  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error('No URL specified for Prometheus client. You can use directUrl in the spec to configure it.');
  }

  const specHeaders = proxy?.spec.headers;

  // Could think about this becoming a class, although it definitely doesn't have to be
  return {
    options: {
      datasourceUrl,
    },
    healthCheck: healthCheck({ datasourceUrl, headers: specHeaders, queryParams }),
    instantQuery: wrapClientMethod(instantQuery, datasourceUrl, specHeaders, queryParams),
    rangeQuery: wrapClientMethod(rangeQuery, datasourceUrl, specHeaders, queryParams),
    labelNames: wrapClientMethod(labelNames, datasourceUrl, specHeaders, queryParams),
    labelValues: wrapClientMethod(labelValues, datasourceUrl, specHeaders, queryParams),
    metricMetadata: wrapClientMethod(metricMetadata, datasourceUrl, specHeaders, queryParams),
    series: wrapClientMethod(series, datasourceUrl, specHeaders, queryParams),
    parseQuery: wrapClientMethod(parseQuery, datasourceUrl, specHeaders, queryParams),
  };
};

const getBuiltinVariableDefinitions: () => BuiltinVariableDefinition[] = () => {
  return [
    {
      kind: 'BuiltinVariable',
      spec: {
        name: '__interval',
        value: () => '$__interval', // will be overriden when time series query is called
        source: 'Prometheus',
        display: {
          name: '__interval',
          description:
            'For dynamic queries that adapt across different time ranges, use $__interval instead of hardcoded intervals. It represents the actual spacing between data points: it’s calculated based on the current time range and the panel pixel width (taking the "Min step" as a lower bound).',
          hidden: true,
        },
      },
    },
    {
      kind: 'BuiltinVariable',
      spec: {
        name: '__interval_ms',
        value: () => '$__interval_ms', // will be overriden when time series query is called
        source: 'Prometheus',
        display: {
          name: '__interval_ms',
          description: 'Same as $__interval but in milliseconds.',
          hidden: true,
        },
      },
    },
    {
      kind: 'BuiltinVariable',
      spec: {
        name: '__rate_interval',
        value: () => '$__rate_interval', // will be overriden when time series query is called
        source: 'Prometheus',
        display: {
          name: '__rate_interval',
          description:
            'Use this one rather than $__interval as the range parameter of functions like rate, increase, etc. With such function it is advised to choose a range that is at least 4x the scrape interval (this is to allow for various races, and to be resilient to a failed scrape). $__rate_interval provides that, as it is defined as `max($__interval + Min Step, 4 * Min Step)`, where Min Step value should represent the scrape interval of the metrics.',
          hidden: true,
        },
      },
    },
  ] as BuiltinVariableDefinition[];
};

export const PrometheusDatasource: DatasourcePlugin<PrometheusDatasourceSpec, PrometheusClient> = {
  createClient,
  getBuiltinVariableDefinitions,
  OptionsEditorComponent: PrometheusDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};
