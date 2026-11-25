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

// Package expression provides the Go SDK of the TimeSeriesExpressionQuery plugin: a time series query computed from
// the other time series queries of a panel, whatever their datasource. Only the Math type is available for now.
package expression

import (
	"github.com/perses/perses/go-sdk/query"
	"github.com/perses/spec/go/plugin"
)

const PluginKind = "TimeSeriesExpressionQuery"

type Type string

const (
	TypeMath Type = "math"
)

// PluginSpec is the spec of the TimeSeriesExpressionQuery plugin. Depending on the Type, only a subset of the fields
// is used.
type PluginSpec struct {
	Type             Type   `json:"type" yaml:"type"`
	Expression       string `json:"expression,omitempty" yaml:"expression,omitempty"`
	SeriesNameFormat string `json:"seriesNameFormat,omitempty" yaml:"seriesNameFormat,omitempty"`
}

type Option func(spec *PluginSpec) error

// SeriesNameFormat sets the legend format, using {{label_name}} interpolation, e.g. "{{instance}}".
func SeriesNameFormat(format string) Option {
	return func(spec *PluginSpec) error {
		spec.SeriesNameFormat = format
		return nil
	}
}

func build(spec PluginSpec, options ...Option) query.Option {
	var err error
	for _, opt := range options {
		if err = opt(&spec); err != nil {
			break
		}
	}
	return query.Option{
		Kind: plugin.KindTimeSeriesExpressionQuery,
		Plugin: plugin.Plugin{
			Kind: PluginKind,
			Spec: spec,
		},
		Error: err,
	}
}

// Math computes a formula on the other queries of the panel. The other queries are referenced by their
// 1-based position: $1, $2, $3... Example: Math("$1 / $2 * 100").
func Math(expression string, options ...Option) query.Option {
	return build(PluginSpec{Type: TypeMath, Expression: expression}, options...)
}

