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

package resourcegraphkqlquery

import (
	"github.com/perses/perses/go-sdk/datasource"
	"github.com/perses/perses/go-sdk/query"
	"github.com/perses/spec/go/plugin"
)

const PluginKind = "AzureResourceGraphKqlQuery"

type PluginSpec struct {
	Datasource       *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	KqlQuery         string               `json:"kqlQuery" yaml:"kqlQuery"`
	Subscriptions    []string             `json:"subscriptions,omitempty" yaml:"subscriptions,omitempty"`
	ManagementGroups []string             `json:"managementGroups,omitempty" yaml:"managementGroups,omitempty"`
}

type Option func(plugin *Builder) error

func create(kqlQuery string, options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		KqlQuery(kqlQuery),
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

func AzureResourceGraphKql(kqlQuery string, options ...Option) query.Option {
	plg, err := create(kqlQuery, options...)
	return query.Option{
		Kind: plugin.KindJsonQuery,
		Plugin: plugin.Plugin{
			Kind: PluginKind,
			Spec: plg,
		},
		Error: err,
	}
}
