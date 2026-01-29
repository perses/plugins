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

package timeseries

import (
	"github.com/perses/perses/go-sdk/datasource"
	"github.com/perses/perses/go-sdk/query"
)

const PluginKind = "SplunkTimeSeriesQuery"

type PluginSpec struct {
	Datasource *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	Query      string               `json:"query" yaml:"query"`
	TimeField  string               `json:"timeField,omitempty" yaml:"timeField,omitempty"`
	ValueField string               `json:"valueField,omitempty" yaml:"valueField,omitempty"`
}

type Option func(plugin *Builder) error

func create(query string, options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		Query(query),
		TimeField("_time"),
		ValueField("value"),
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

func SplunkTimeSeriesQuery(spl string, options ...Option) query.Option {
	return func(builder *query.Builder) error {
		plugin, err := create(spl, options...)
		if err != nil {
			return err
		}

		builder.Spec.Plugin.Kind = PluginKind
		builder.Spec.Plugin.Spec = plugin
		return nil
	}
}
