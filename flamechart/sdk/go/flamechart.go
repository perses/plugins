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

package flamechart

import (
	"github.com/perses/perses/go-sdk/panel"
)

const PluginKind = "FlameChart"

type Palette string

const (
	ValuePaletteMode   Palette = "value"
	PackagePaletteMode Palette = "package-name"
)

type PluginSpec struct {
	ShowSettings   bool    `json:"showSettings,omitempty" yaml:"showSettings,omitempty"`
	ShowSeries     bool    `json:"showSeries,omitempty" yaml:"showSeries,omitempty"`
	ShowTable      bool    `json:"showTable,omitempty" yaml:"showTable,omitempty"`
	ShowFlameGraph bool    `json:"showFlameGraph,omitempty" yaml:"showFlameGraph,omitempty"`
	Palette        Palette `json:"mode" yaml:"mode"`
}

type Option func(plugin *Builder) error

type Builder struct {
	PluginSpec `json:",inline" yaml:",inline"`
}

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
