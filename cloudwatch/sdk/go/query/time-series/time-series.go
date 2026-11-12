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

package timeseries

import (
	"github.com/perses/perses/go-sdk/datasource"
	"github.com/perses/perses/go-sdk/query"
	"github.com/perses/spec/go/plugin"
)

const PluginKind = "CloudWatchTimeSeriesQuery"

type MetricStat struct {
	Namespace  string            `json:"namespace" yaml:"namespace"`
	Name       string            `json:"name" yaml:"name"`
	Dimensions map[string]string `json:"dimensions,omitempty" yaml:"dimensions,omitempty"`
	Statistic  string            `json:"statistic" yaml:"statistic"`
	// Period is the minimum period in seconds, a multiple of 60. It is increased for long time ranges.
	Period int `json:"period" yaml:"period"`
}

// Query is either a metric or a metric math expression referencing the IDs of the other queries.
type Query struct {
	ID         string      `json:"id" yaml:"id"`
	Metric     *MetricStat `json:"metric,omitempty" yaml:"metric,omitempty"`
	Expression string      `json:"expression,omitempty" yaml:"expression,omitempty"`
	Label      string      `json:"label,omitempty" yaml:"label,omitempty"`
	ReturnData *bool       `json:"returnData,omitempty" yaml:"returnData,omitempty"`
}

type PluginSpec struct {
	Datasource *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	Queries    []Query              `json:"queries" yaml:"queries"`
}

type Option func(plugin *Builder) error

func create(options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	for _, opt := range options {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

type Builder struct {
	PluginSpec `json:",inline" yaml:",inline"`
}

func CloudWatchTimeSeriesQuery(options ...Option) query.Option {
	plg, err := create(options...)
	return query.Option{
		Kind: plugin.KindTimeSeriesQuery,
		Plugin: plugin.Plugin{
			Kind: PluginKind,
			Spec: plg,
		},
		Error: err,
	}
}
