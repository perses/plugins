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

package panel

import (
	"github.com/perses/perses/go-sdk/panel"
)

const PluginKind = "AlertTable"

type SortDirection string

const (
	AscSort  SortDirection = "asc"
	DescSort SortDirection = "desc"
)

type ColumnSortMode string

const (
	AlphabeticalSort ColumnSortMode = "alphabetical"
	NumericSort      ColumnSortMode = "numeric"
	SeveritySort     ColumnSortMode = "severity"
)

type DeduplicationMode string

const (
	DeduplicationNone        DeduplicationMode = "none"
	DeduplicationFingerprint DeduplicationMode = "fingerprint"
	DeduplicationLabels      DeduplicationMode = "labels"
)

type AlertAction string

const (
	SilenceAction AlertAction = "silence"
	RunbookAction AlertAction = "runbook"
)

type LabelColorMode string

const (
	AutoColorMode     LabelColorMode = "auto"
	SeverityColorMode LabelColorMode = "severity"
	ManualColorMode   LabelColorMode = "manual"
)

type ColumnDefinition struct {
	Name          string         `json:"name" yaml:"name"`
	Header        string         `json:"header,omitempty" yaml:"header,omitempty"`
	EnableSorting *bool          `json:"enableSorting,omitempty" yaml:"enableSorting,omitempty"`
	Sort          SortDirection  `json:"sort,omitempty" yaml:"sort,omitempty"`
	SortMode      ColumnSortMode `json:"sortMode,omitempty" yaml:"sortMode,omitempty"`
}

type DeduplicationConfig struct {
	Mode   DeduplicationMode `json:"mode" yaml:"mode"`
	Labels []string          `json:"labels,omitempty" yaml:"labels,omitempty"`
}

type LabelColorOverride struct {
	Value   string `json:"value" yaml:"value"`
	IsRegex bool   `json:"isRegex" yaml:"isRegex"`
	Color   string `json:"color" yaml:"color"`
}

type LabelColorMapping struct {
	LabelKey  string               `json:"labelKey" yaml:"labelKey"`
	Mode      LabelColorMode       `json:"mode" yaml:"mode"`
	Overrides []LabelColorOverride `json:"overrides,omitempty" yaml:"overrides,omitempty"`
}

type PluginSpec struct {
	DefaultGroupBy      []string              `json:"defaultGroupBy,omitempty" yaml:"defaultGroupBy,omitempty"`
	Columns             []ColumnDefinition    `json:"columns,omitempty" yaml:"columns,omitempty"`
	Deduplication       *DeduplicationConfig  `json:"deduplication,omitempty" yaml:"deduplication,omitempty"`
	AllowedActions      []AlertAction         `json:"allowedActions,omitempty" yaml:"allowedActions,omitempty"`
	RunbookAnnotationKey string               `json:"runbookAnnotationKey,omitempty" yaml:"runbookAnnotationKey,omitempty"`
	LabelColorMappings  []LabelColorMapping   `json:"labelColorMappings,omitempty" yaml:"labelColorMappings,omitempty"`
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

func AlertTable(options ...Option) panel.Option {
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
