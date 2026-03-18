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

package traceheatmap

import "github.com/perses/perses/go-sdk/panel"

const PluginKind = "TraceHeatmap"

const (
	ScaleLinear      = "linear"
	ScaleLogarithmic = "logarithmic"
	OverflowClamp    = "clamp"
	OverflowFilter   = "filter"
)

type DistributionSettings struct {
	Unit             string `json:"unit" yaml:"unit"`
	Bins             int    `json:"bins" yaml:"bins"`
	Scale            string `json:"scale" yaml:"scale"`
	Min              int    `json:"min" yaml:"min"`
	Max              int    `json:"max" yaml:"max"`
	OverflowStrategy string `json:"overflowStrategy" yaml:"overflowStrategy"`
}

type Spec struct {
	DistributionSettings DistributionSettings `json:"distributionSettings" yaml:"distributionSettings"`
}

type Builder struct {
	Spec `json:",inline" yaml:",inline"`
}

type Option func(plugin *Builder) error

func create(options ...Option) (Builder, error) {
	builder := &Builder{
		Spec: Spec{
			DistributionSettings: DistributionSettings{
				Unit:             "ms",
				Bins:             25,
				Scale:            "linear",
				Min:              0,
				Max:              2000,
				OverflowStrategy: "clamp",
			},
		},
	}

	for _, opt := range options {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

func TraceHeatmap(options ...Option) panel.Option {
	return func(builder *panel.Builder) error {
		plugin, err := create(options...)
		if err != nil {
			return err
		}

		builder.Spec.Plugin.Kind = PluginKind
		builder.Spec.Plugin.Spec = plugin.Spec
		return nil
	}
}
