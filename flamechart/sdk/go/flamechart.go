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
	ShowSettings   bool    `json:"showSettings" yaml:"showSettings"`
	ShowSeries     bool    `json:"showSeries" yaml:"showSeries"`
	ShowTable      bool    `json:"showTable" yaml:"showTable"`
	ShowFlameGraph bool    `json:"showFlameGraph" yaml:"showFlameGraph"`
	Palette        Palette `json:"palette" yaml:"palette"`
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
