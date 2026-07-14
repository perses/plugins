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

package canvas

import (
	"github.com/perses/perses/go-sdk/common"
	"github.com/perses/perses/go-sdk/panel"
)

const PluginKind = "Canvas"

type LabelPosition string

const (
	AbovePosition  LabelPosition = "above"
	BelowPosition  LabelPosition = "below"
	LeftPosition   LabelPosition = "left"
	RightPosition  LabelPosition = "right"
	CenterPosition LabelPosition = "center"
)

type AnchorPoint string

const (
	AnchorN  AnchorPoint = "n"
	AnchorS  AnchorPoint = "s"
	AnchorE  AnchorPoint = "e"
	AnchorW  AnchorPoint = "w"
	AnchorNW AnchorPoint = "nw"
	AnchorNE AnchorPoint = "ne"
	AnchorSW AnchorPoint = "sw"
	AnchorSE AnchorPoint = "se"
)

type NodeKind string

const (
	RectangleKind NodeKind = "rectangle"
	IconKind      NodeKind = "icon"
	TextKind      NodeKind = "text"
)

type ColorMode string

const (
	ThresholdColorMode ColorMode = "threshold"
	FixedColorMode     ColorMode = "fixed"
)

type ThicknessMode string

const (
	FixedThicknessMode     ThicknessMode = "fixed"
	ThresholdThicknessMode ThicknessMode = "threshold"
)

type ImageFit string

const (
	CoverImageFit    ImageFit = "cover"
	ContainImageFit  ImageFit = "contain"
	StretchImageFit  ImageFit = "stretch"
)

type NodeSpec struct {
	ID              string        `json:"id" yaml:"id"`
	X               float64       `json:"x" yaml:"x"`
	Y               float64       `json:"y" yaml:"y"`
	Width           float64       `json:"width" yaml:"width"`
	Height          float64       `json:"height" yaml:"height"`
	Kind            NodeKind      `json:"kind" yaml:"kind"`
	Label           string        `json:"label,omitempty" yaml:"label,omitempty"`
	LabelPosition   LabelPosition `json:"labelPosition,omitempty" yaml:"labelPosition,omitempty"`
	LabelPadding    float64       `json:"labelPadding,omitempty" yaml:"labelPadding,omitempty"`
	Icon            string        `json:"icon,omitempty" yaml:"icon,omitempty"`
	Link            string        `json:"link,omitempty" yaml:"link,omitempty"`
	Background      string        `json:"background,omitempty" yaml:"background,omitempty"`
	BackgroundImage string        `json:"backgroundImage,omitempty" yaml:"backgroundImage,omitempty"`
	QueryIndex      *uint         `json:"queryIndex,omitempty" yaml:"queryIndex,omitempty"`
	ColorMode       ColorMode     `json:"colorMode,omitempty" yaml:"colorMode,omitempty"`
	Color           string        `json:"color,omitempty" yaml:"color,omitempty"`
}

type EdgeSpec struct {
	ID                  string        `json:"id" yaml:"id"`
	Name                string        `json:"name,omitempty" yaml:"name,omitempty"`
	Source              string        `json:"source" yaml:"source"`
	Target              string        `json:"target" yaml:"target"`
	SourceAnchor        AnchorPoint   `json:"sourceAnchor,omitempty" yaml:"sourceAnchor,omitempty"`
	TargetAnchor        AnchorPoint   `json:"targetAnchor,omitempty" yaml:"targetAnchor,omitempty"`
	X2                  *float64      `json:"x2,omitempty" yaml:"x2,omitempty"`
	Y2                  *float64      `json:"y2,omitempty" yaml:"y2,omitempty"`
	Bidirectional       bool          `json:"bidirectional,omitempty" yaml:"bidirectional,omitempty"`
	ThicknessMode       ThicknessMode `json:"thicknessMode,omitempty" yaml:"thicknessMode,omitempty"`
	StrokeWidth         *float64      `json:"strokeWidth,omitempty" yaml:"strokeWidth,omitempty"`
	SourceQueryIndex    *uint         `json:"sourceQueryIndex,omitempty" yaml:"sourceQueryIndex,omitempty"`
	TargetQueryIndex    *uint         `json:"targetQueryIndex,omitempty" yaml:"targetQueryIndex,omitempty"`
	SourceLabelTemplate string        `json:"sourceLabelTemplate,omitempty" yaml:"sourceLabelTemplate,omitempty"`
	TargetLabelTemplate string        `json:"targetLabelTemplate,omitempty" yaml:"targetLabelTemplate,omitempty"`
}

type BackgroundSpec struct {
	ID       string   `json:"id" yaml:"id"`
	Name     string   `json:"name,omitempty" yaml:"name,omitempty"`
	X        float64  `json:"x" yaml:"x"`
	Y        float64  `json:"y" yaml:"y"`
	Width    float64  `json:"width" yaml:"width"`
	Height   float64  `json:"height" yaml:"height"`
	Color    string   `json:"color,omitempty" yaml:"color,omitempty"`
	Opacity  *float64 `json:"opacity,omitempty" yaml:"opacity,omitempty"`
	Image    string   `json:"image,omitempty" yaml:"image,omitempty"`
	ImageFit ImageFit `json:"imageFit,omitempty" yaml:"imageFit,omitempty"`
	Global   bool     `json:"global,omitempty" yaml:"global,omitempty"`
}

type EdgeThresholdStep struct {
	Value       float64 `json:"value" yaml:"value"`
	StrokeWidth float64 `json:"strokeWidth" yaml:"strokeWidth"`
}

type QueryColorSettings struct {
	QueryIndex uint      `json:"queryIndex" yaml:"queryIndex"`
	ColorMode  ColorMode `json:"colorMode" yaml:"colorMode"`
	ColorValue string    `json:"colorValue" yaml:"colorValue"`
}

type PluginSpec struct {
	Thresholds            *common.Thresholds   `json:"thresholds,omitempty" yaml:"thresholds,omitempty"`
	Format                *common.Format       `json:"format,omitempty" yaml:"format,omitempty"`
	EdgeThresholdWidths   []EdgeThresholdStep  `json:"edgeThresholdWidths,omitempty" yaml:"edgeThresholdWidths,omitempty"`
	EdgeDefaultStrokeWidth *float64            `json:"edgeDefaultStrokeWidth,omitempty" yaml:"edgeDefaultStrokeWidth,omitempty"`
	QuerySettings         []QueryColorSettings `json:"querySettings,omitempty" yaml:"querySettings,omitempty"`
	Backgrounds           []BackgroundSpec     `json:"backgrounds,omitempty" yaml:"backgrounds,omitempty"`
	Nodes                 []NodeSpec           `json:"nodes,omitempty" yaml:"nodes,omitempty"`
	Edges                 []EdgeSpec           `json:"edges,omitempty" yaml:"edges,omitempty"`
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
		plugin, err := create(options...)
		if err != nil {
			return err
		}
		builder.Spec.Plugin.Kind = PluginKind
		builder.Spec.Plugin.Spec = plugin.PluginSpec
		return nil
	}
}
