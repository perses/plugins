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

package silences

import (
	"github.com/perses/perses/go-sdk/datasource"
	"github.com/perses/perses/go-sdk/query"
	"github.com/perses/perses/pkg/model/api/v1/common"
	"github.com/perses/perses/pkg/model/api/v1/plugin"
)

const PluginKind = "AlertManagerSilencesQuery"

type PluginSpec struct {
	Datasource *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	Filters    []string             `json:"filters,omitempty" yaml:"filters,omitempty"`
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

func SilencesQuery(options ...Option) query.Option {
	plg, err := create(options...)
	return query.Option{
		Kind: plugin.KindSilencesQuery,
		Plugin: common.Plugin{
			Kind: PluginKind,
			Spec: plg,
		},
		Error: err,
	}
}
