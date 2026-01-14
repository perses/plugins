// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package datasourcevariable

import (
	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"
)

type PluginSpec struct {
	DatasourcePluginKind string `json:"datasourcePluginKind" yaml:"datasourcePluginKind"`
}

type Builder struct {
	PluginSpec
}

type Option func(plugin *Builder) error

func create(datasourcePluginKind string, options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		DatasourcePluginKind(datasourcePluginKind),
	}

	for _, opt := range append(defaults, options...) {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

const PluginKind = "DatasourceVariable"

func Datasource(datasourcePluginKind string, options ...Option) listvariable.Option {
	return func(builder *listvariable.Builder) error {
		r, err := create(datasourcePluginKind, options...)
		if err != nil {
			return err
		}
		builder.ListVariableSpec.Plugin.Kind = PluginKind
		builder.ListVariableSpec.Plugin.Spec = r
		return nil
	}
}
