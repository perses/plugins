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

const PluginKind = "SQLTimeSeriesQuery"

type PluginSpec struct {
	Datasource   *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	Query        string               `json:"query" yaml:"query"`
	TimeColumn   string               `json:"timeColumn,omitempty" yaml:"timeColumn,omitempty"`
	ValueColumns []string             `json:"valueColumns,omitempty" yaml:"valueColumns,omitempty"`
	LabelColumns []string             `json:"labelColumns,omitempty" yaml:"labelColumns,omitempty"`
	MinStep      int                  `json:"minStep,omitempty" yaml:"minStep,omitempty"`
	TimeFormat   string               `json:"timeFormat,omitempty" yaml:"timeFormat,omitempty"`
}

type Option func(plugin *Builder) error

func create(sqlQuery string, options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		Query(sqlQuery),
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

func SQLTimeSeriesQuery(sqlQuery string, options ...Option) query.Option {
	plg, err := create(sqlQuery, options...)
	return query.Option{
		Kind: plugin.KindTimeSeriesQuery,
		Plugin: plugin.Plugin{
			Kind: PluginKind,
			Spec: plg,
		},
		Error: err,
	}
}
