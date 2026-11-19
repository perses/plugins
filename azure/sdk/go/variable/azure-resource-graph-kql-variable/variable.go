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

package resourcegraphkqlvariable

import (
	"github.com/perses/perses/go-sdk/datasource"
	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"
)

const PluginKind = "AzureResourceGraphKqlVariable"

type PluginSpec struct {
	Datasource       *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	KqlQuery         string               `json:"kqlQuery" yaml:"kqlQuery"`
	Subscriptions    []string             `json:"subscriptions,omitempty" yaml:"subscriptions,omitempty"`
	ManagementGroups []string             `json:"managementGroups,omitempty" yaml:"managementGroups,omitempty"`
	LabelColumnName  string               `json:"labelColumnName,omitempty" yaml:"labelColumnName,omitempty"`
	ValueColumnName  string               `json:"valueColumnName" yaml:"valueColumnName"`
}

type Option func(plugin *Builder) error

func create(kqlQuery string, valueColumnName string, options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		KqlQuery(kqlQuery),
		ValueColumnName(valueColumnName),
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

func AzureResourceGraphKql(kqlQuery string, valueColumnName string, options ...Option) listvariable.Option {
	return func(builder *listvariable.Builder) error {
		t, err := create(kqlQuery, valueColumnName, options...)
		if err != nil {
			return err
		}
		builder.ListVariableSpec.Plugin.Kind = PluginKind
		builder.ListVariableSpec.Plugin.Spec = t
		return nil
	}
}
