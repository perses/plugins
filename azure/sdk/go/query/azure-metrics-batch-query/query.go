// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package metricsbatchquery

import (
	"github.com/perses/perses/go-sdk/datasource"
	"github.com/perses/perses/go-sdk/query"
	"github.com/perses/spec/go/plugin"
)

const PluginKind = "AzureMetricsBatchQuery"

// AggregationType is one of the aggregations supported by the Azure Metrics Batch API.
type AggregationType string

const (
	AggregationAverage AggregationType = "average"
	AggregationCount   AggregationType = "count"
	AggregationMaximum AggregationType = "maximum"
	AggregationMinimum AggregationType = "minimum"
	AggregationTotal   AggregationType = "total"
)

type PluginSpec struct {
	Datasource      *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	SubscriptionID  string               `json:"subscriptionId" yaml:"subscriptionId"`
	ResourceIDs     []string             `json:"resourceIds" yaml:"resourceIds"`
	MetricNamespace string               `json:"metricNamespace" yaml:"metricNamespace"`
	MetricNames     []string             `json:"metricNames" yaml:"metricNames"`
	Aggregation     []AggregationType    `json:"aggregation,omitempty" yaml:"aggregation,omitempty"`
	Filter          string               `json:"filter,omitempty" yaml:"filter,omitempty"`
	Interval        string               `json:"interval,omitempty" yaml:"interval,omitempty"`
	SinglePoint     *bool                `json:"singlePoint,omitempty" yaml:"singlePoint,omitempty"`
	FlattenMetrics  *bool                `json:"flattenMetrics,omitempty" yaml:"flattenMetrics,omitempty"`
	Top             *int                 `json:"top,omitempty" yaml:"top,omitempty"`
	OrderBy         string               `json:"orderBy,omitempty" yaml:"orderBy,omitempty"`
	RollupBy        string               `json:"rollupBy,omitempty" yaml:"rollupBy,omitempty"`
}

type Option func(plugin *Builder) error

func create(subscriptionID string, resourceIDs []string, metricNamespace string, metricNames []string, options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		SubscriptionID(subscriptionID),
		ResourceIDs(resourceIDs...),
		MetricNamespace(metricNamespace),
		MetricNames(metricNames...),
	}

	for _, opt := range append(defaults, options...) {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

type Builder struct {
	PluginSpec `json:",inline" yaml:",inline"`
}

func AzureMetricsBatch(subscriptionId string, resourceIds []string, metricNamespace string, metricNames []string, options ...Option) query.Option {
	plg, err := create(subscriptionId, resourceIds, metricNamespace, metricNames, options...)
	return query.Option{
		Kind: plugin.KindTimeSeriesQuery,
		Plugin: plugin.Plugin{
			Kind: PluginKind,
			Spec: plg,
		},
		Error: err,
	}
}
