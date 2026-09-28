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

package pie

import (
	"github.com/perses/perses/go-sdk/common"
	"github.com/perses/perses/go-sdk/panel"
)

const (
	PluginKind         = "PieChart"
	defaultOuterRadius = 100
)

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
	Position LegendPosition       `json:"position" yaml:"position"`
	Mode     LegendMode           `json:"mode,omitempty" yaml:"mode,omitempty"`
	Size     LegendSize           `json:"size,omitempty" yaml:"size,omitempty"`
	Values   []common.Calculation `json:"values,omitempty" yaml:"values,omitempty"`
}

type Sort string

const (
	AscendingSort  Sort = "asc"
	DescendingSort Sort = "desc"
)

type PluginMode string

const (
	ValueMode      PluginMode = "value"
	PercentageMode PluginMode = "percentage"
)

// Deprecated: these options were inherited from a different chart model and
// are ignored when serializing PieChart visual settings.
type PaletteMode string

const (
	AutoMode        PaletteMode = "auto"
	CategoricalMode PaletteMode = "categorical"
)

// Deprecated: use Visual.ColorPalette.
type Palette struct {
	Mode PaletteMode `json:"-" yaml:"-"`
}

// Deprecated: retained for source compatibility.
type VisualDisplay string

const (
	LineDisplay VisualDisplay = "line"
	BarDisplay  VisualDisplay = "bar"
)

// Deprecated: retained for source compatibility.
type VisualShowPoints string

const (
	AutoShowPoints   VisualShowPoints = "auto"
	AlwaysShowPoints VisualShowPoints = "always"
)

// Deprecated: retained for source compatibility.
type VisualStack string

const (
	AllStack        VisualStack = "all"
	PercentageStack VisualStack = "percent"
)

// Deprecated: retained for source compatibility.
type ColorMode string

const (
	FixedMode       ColorMode = "fixed"
	FixedSingleMode ColorMode = "fixed-single"
)

// Deprecated: query-specific colors are not supported by PieChart.
type QuerySettingsItem struct {
	QueryIndex uint      `json:"-" yaml:"-"`
	ColorMode  ColorMode `json:"-" yaml:"-"`
	ColorValue string    `json:"-" yaml:"-"`
}

type Visual struct {
	InnerRadius  int      `json:"innerRadius,omitempty" yaml:"innerRadius,omitempty"`
	OuterRadius  int      `json:"outerRadius" yaml:"outerRadius"`
	ColorPalette []string `json:"colorPalette,omitempty" yaml:"colorPalette,omitempty"`

	// Deprecated fields retained for source compatibility. They are not PieChart settings.
	Display      VisualDisplay    `json:"-" yaml:"-"`
	LineWidth    float64          `json:"-" yaml:"-"`
	AreaOpacity  float64          `json:"-" yaml:"-"`
	ShowPoints   VisualShowPoints `json:"-" yaml:"-"`
	Palette      Palette          `json:"-" yaml:"-"`
	PointRadius  float64          `json:"-" yaml:"-"`
	Stack        VisualStack      `json:"-" yaml:"-"`
	ConnectNulls bool             `json:"-" yaml:"-"`
}

type Option func(plugin *Builder) error

type PluginSpec struct {
	Legend        *Legend              `json:"legend,omitempty" yaml:"legend,omitempty"`
	Calculation   common.Calculation   `json:"calculation" yaml:"calculation"`
	Format        *common.Format       `json:"format,omitempty" yaml:"format,omitempty"`
	Sort          Sort                 `json:"sort,omitempty" yaml:"sort,omitempty"`
	Mode          PluginMode           `json:"mode,omitempty" yaml:"mode,omitempty"`
	ShowLabels    bool                 `json:"showLabels,omitempty" yaml:"showLabels,omitempty"`
	Visual        *Visual              `json:"visual,omitempty" yaml:"visual,omitempty"`
	Radius        int                  `json:"radius,omitempty" yaml:"radius,omitempty"`
	QuerySettings *[]QuerySettingsItem `json:"-" yaml:"-"`
}

func create(options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		Calculation(common.LastCalculation),
		WithVisual(Visual{OuterRadius: defaultOuterRadius}),
	}

	for _, opt := range append(defaults, options...) {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

type Builder struct {
	PluginSpec `json:",inline" yaml:",inline"`
}

func Chart(options ...Option) panel.Option {
	return func(builder *panel.Builder) error {
		plugin, err := create(options...)
		if err != nil {
			return err
		}

		builder.Spec.Plugin.Kind = PluginKind
		builder.Spec.Plugin.Spec = plugin.PluginSpec
		return nil
	}
}
