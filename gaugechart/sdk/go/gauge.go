// Copyright 2024 The Perses Authors
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

package gauge

import (
	"github.com/perses/perses/go-sdk/common"
	"github.com/perses/perses/go-sdk/panel"
)

const PluginKind = "GaugeChart"

type PluginSpec struct {
	Calculation common.Calculation `json:"calculation" yaml:"calculation"`
	Format      *common.Format     `json:"format,omitempty" yaml:"format,omitempty"`
	Thresholds  *common.Thresholds `json:"thresholds,omitempty" yaml:"thresholds,omitempty"`
	Max         float64            `json:"max,omitempty" yaml:"max,omitempty"`
}

type Option func(plugin *Builder) error

type Builder struct {
	PluginSpec `json:",inline" yaml:",inline"`
}

func create(options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		Calculation(common.LastCalculation),
	}

	for _, opt := range append(defaults, options...) {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

func Chart(options ...Option) panel.Option {
	return func(builder *panel.Builder) error {
		r, err := create(options...)
		if err != nil {
			return err
		}
		builder.Spec.Plugin.Kind = PluginKind
		builder.Spec.Plugin.Spec = r.PluginSpec
		return nil
	}
}
