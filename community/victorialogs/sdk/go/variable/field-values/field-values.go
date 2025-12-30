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

package labelvalues

import (
	"github.com/perses/perses/go-sdk/datasource"
	list_variable "github.com/perses/perses/go-sdk/variable/list-variable"
)

const PluginKind = "VictoriaLogsFieldValuesVariable"

type PluginSpec struct {
	Datasource *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	Field      string               `json:"field" yaml:"field"`
	Query      string               `json:"query" yaml:"query"`
}

type Option func(plugin *Builder) error

func create(field string, options ...Option) (Builder, error) {
	var builder = &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		Field(field),
	}

	for _, opt := range append(defaults, options...) {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

func VictoriaLogsFieldValues(field string, options ...Option) list_variable.Option {
	return func(builder *list_variable.Builder) error {
		t, err := create(field, options...)
		if err != nil {
			return err
		}
		builder.ListVariableSpec.Plugin.Kind = PluginKind
		builder.ListVariableSpec.Plugin.Spec = t
		return nil
	}
}

type Builder struct {
	PluginSpec `json:",inline" yaml:",inline"`
}
