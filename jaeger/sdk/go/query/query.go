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
	"github.com/perses/perses/pkg/model/api/v1/common"
	"github.com/perses/perses/pkg/model/api/v1/plugin"
)

const PluginKind = "JaegerTraceQuery"

type PluginSpec struct {
	Datasource  *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	TraceID     string               `json:"traceId,omitempty" yaml:"traceId,omitempty"`
	Service     string               `json:"service,omitempty" yaml:"service,omitempty"`
	Operation   string               `json:"operation,omitempty" yaml:"operation,omitempty"`
	SpanKind    string               `json:"spanKind,omitempty" yaml:"spanKind,omitempty"`
	Tags        string               `json:"tags,omitempty" yaml:"tags,omitempty"`
	MinDuration string               `json:"minDuration,omitempty" yaml:"minDuration,omitempty"`
	MaxDuration string               `json:"maxDuration,omitempty" yaml:"maxDuration,omitempty"`
	Limit       *int                 `json:"limit,omitempty" yaml:"limit,omitempty"`
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

func Trace(options ...Option) query.Option {
	plg, err := create(options...)
	return query.Option{
		Kind: plugin.KindTraceQuery,
		Plugin: common.Plugin{
			Kind: PluginKind,
			Spec: plg,
		},
		Error: err,
	}
}
