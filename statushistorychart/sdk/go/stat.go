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

package statushistory

import (
	"github.com/perses/perses/go-sdk/panel"
)

const PluginKind = "StatusHistoryChart"

type LegendPosition string

const (
	BottomPosition LegendPosition = "bottom"
	RightPosition  LegendPosition = "right"
)

type LegendMode string

const (
	ListMode  LegendMode = "list"
	TableMode LegendMode = "table"
)

type LegendSize string

const (
	SmallSize  LegendSize = "small"
	MediumSize LegendSize = "medium"
)

type Legend struct {
	Position LegendPosition `json:"position" yaml:"position"`
	Mode     LegendMode     `json:"mode,omitempty" yaml:"mode,omitempty"`
	Size     LegendSize     `json:"size,omitempty" yaml:"size,omitempty"`
}

type PluginSpec struct {
	Legend *Legend `json:"legend,omitempty" yaml:"legend,omitempty"`
	// TODO missing mappings
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
