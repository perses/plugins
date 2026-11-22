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

package query

import (
	"github.com/perses/perses/go-sdk/datasource"
	"github.com/perses/perses/go-sdk/query"
	"github.com/perses/spec/go/plugin"
)

// PluginKind is the kind of the plugin.
const PluginKind = "TrinoJsonQuery"

// PluginSpec is the spec of the plugin.
type PluginSpec struct {
	Datasource        *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	Query             string               `json:"query" yaml:"query"`
	Catalog           string               `json:"catalog,omitempty" yaml:"catalog,omitempty"`
	Schema            string               `json:"schema,omitempty" yaml:"schema,omitempty"`
	SessionProperties string               `json:"sessionProperties,omitempty" yaml:"sessionProperties,omitempty"`
	Source            string               `json:"source,omitempty" yaml:"source,omitempty"`
	RoutingGroup      string               `json:"routingGroup,omitempty" yaml:"routingGroup,omitempty"`
}

// Option configures the plugin builder.
type Option func(plugin *Builder) error

func create(query string, options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		Query(query),
	}

	for _, opt := range append(defaults, options...) {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

// Builder holds the plugin spec being built.
type Builder struct {
	PluginSpec `json:",inline" yaml:",inline"`
}

// TrinoJsonQuery returns a JSON query option that runs the given SQL.
func TrinoJsonQuery(expr string, options ...Option) query.Option {
	plg, err := create(expr, options...)
	return query.Option{
		Kind: plugin.KindJsonQuery,
		Plugin: plugin.Plugin{
			Kind: PluginKind,
			Spec: plg,
		},
		Error: err,
	}
}
