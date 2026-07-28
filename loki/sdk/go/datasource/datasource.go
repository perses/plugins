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

package datasource

import (
	"github.com/perses/perses/go-sdk/datasource"
	datasourceSpec "github.com/perses/spec/go/datasource"
)

const (
	PluginKind = "LokiDatasource"
)

type Option func(plugin *Builder) error

func create(options ...Option) (Builder, error) {
	builder := &Builder{
		HTTPDatasourceSpec: datasourceSpec.HTTPDatasourceSpec{},
	}

	var defaults []Option

	for _, opt := range append(defaults, options...) {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

type Builder struct {
	datasourceSpec.HTTPDatasourceSpec `json:",inline" yaml:",inline"`
}

func Loki(options ...Option) datasource.Option {
	return func(builder *datasource.Builder) error {
		plugin, err := create(options...)
		if err != nil {
			return err
		}

		builder.Spec.Plugin.Kind = PluginKind
		builder.Spec.Plugin.Spec = plugin.HTTPDatasourceSpec
		return nil
	}
}

func Selector(datasourceName string) *datasource.Selector {
	return &datasource.Selector{
		Kind: PluginKind,
		Name: datasourceName,
	}
}
