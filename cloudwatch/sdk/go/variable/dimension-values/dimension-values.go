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

package dimensionvalues

import (
	"github.com/perses/perses/go-sdk/datasource"
	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"
	cloudwatchDatasource "github.com/perses/plugins/cloudwatch/sdk/go/datasource"
)

const PluginKind = "CloudWatchDimensionValuesVariable"

type PluginSpec struct {
	Datasource   *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	Namespace    string               `json:"namespace" yaml:"namespace"`
	MetricName   string               `json:"metricName,omitempty" yaml:"metricName,omitempty"`
	DimensionKey string               `json:"dimensionKey" yaml:"dimensionKey"`
	Dimensions   map[string]string    `json:"dimensions,omitempty" yaml:"dimensions,omitempty"`
}

type Option func(plugin *Builder) error

type Builder struct {
	PluginSpec `json:",inline" yaml:",inline"`
}

func create(namespace string, dimensionKey string, options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{Namespace: namespace, DimensionKey: dimensionKey},
	}

	for _, opt := range options {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

// CloudWatchDimensionValues defines a list variable whose options are the values of a dimension in a namespace.
func CloudWatchDimensionValues(namespace string, dimensionKey string, options ...Option) listvariable.Option {
	return func(builder *listvariable.Builder) error {
		plg, err := create(namespace, dimensionKey, options...)
		if err != nil {
			return err
		}
		builder.ListVariableSpec.Plugin.Kind = PluginKind
		builder.ListVariableSpec.Plugin.Spec = plg
		return nil
	}
}

func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		builder.Datasource = cloudwatchDatasource.Selector(datasourceName)
		return nil
	}
}

// MetricName limits the discovery to a metric.
func MetricName(metricName string) Option {
	return func(builder *Builder) error {
		builder.MetricName = metricName
		return nil
	}
}

// Dimensions limits the discovery to the metrics having these dimension values. The values can use variables.
func Dimensions(dimensions map[string]string) Option {
	return func(builder *Builder) error {
		builder.Dimensions = dimensions
		return nil
	}
}
