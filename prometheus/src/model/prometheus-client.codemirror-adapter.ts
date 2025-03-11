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

import { PrometheusClient as CodeMirrorPrometheusClient } from '@prometheus-io/codemirror-promql';
import { LabelNamesRequestParameters, LabelValuesRequestParameters, SeriesRequestParameters } from './api-types';
import { Matcher } from '@prometheus-io/codemirror-promql/dist/esm/types';
import { PrometheusClient } from './prometheus-client';
import { MetricMetadata } from '@prometheus-io/codemirror-promql/dist/esm/client/prometheus';

export const createCodeMirrorPromClient = (
  prometheusClient?: PrometheusClient
): CodeMirrorPrometheusClient | undefined => {
  if (prometheusClient) {
    return {
      labelNames: async (metricNames: string | undefined) => {
        let params: LabelNamesRequestParameters = {};

        if (metricNames) {
          params['match[]'] = metricNames.split(',');
        }
        const { data } = (await prometheusClient?.labelNames(params)) || {};
        return data || [];
      },
      labelValues: async (labelName: string, metricName?: string, matchers?: Matcher[]) => {
        let params: LabelValuesRequestParameters = {
          labelName,
        };
        if (metricName) {
          params['match[]'] = [
            `${metricName}{${matchers
              ?.reduce((acc: Matcher[], curr: Matcher) => {
                if (!curr.matchesEmpty()) {
                  acc.push(curr);
                }
                return acc;
              }, [])
              .map((m) => `${m.name}${m.type}"${m.value}"`)
              .join(',')}}`,
          ];
        }

        const { data } = (await prometheusClient?.labelValues(params)) || {};
        return data || [];
      },
      metricNames: async (prefix?: string) => {
        let params: LabelValuesRequestParameters = {
          labelName: '__name__',
        };
        const { data } = (await prometheusClient?.labelValues(params)) || {};
        return data || [];
      },
      metricMetadata: async (): Promise<Record<string, MetricMetadata[]>> => {
        const { data } = (await prometheusClient?.metricMetadata({})) || {};

        return data || {};
      },
      series: async (metricName: string, matchers?: Matcher[], labelName?: string): Promise<Map<string, string>[]> => {
        const params: SeriesRequestParameters = {
          'match[]': [],
        };
        const { data } = (await prometheusClient?.series(params)) || {};
        return (data || []).map((item: any) => new Map(Object.entries(item.metric)));
      },
      flags: async () => {
        const { data } = (await prometheusClient?.flags()) || {};

        return data || {};
      },
    };
  }
};
