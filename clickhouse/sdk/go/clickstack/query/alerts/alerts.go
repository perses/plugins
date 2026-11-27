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

package alerts

import (
	"github.com/perses/perses/go-sdk/datasource"
	"github.com/perses/perses/go-sdk/query"
	"github.com/perses/spec/go/plugin"
)

const PluginKind = "ClickStackAlertsQuery"

// State is the state of a ClickStack alert.
type State string

const (
	// StateAlert is the state of the firing alerts.
	StateAlert State = "ALERT"
	// StatePending is the state of the alerts over their threshold, but not for long enough to fire.
	StatePending State = "PENDING"
	// StateOK is the state of the alerts that are not firing.
	StateOK               State = "OK"
	StateInsufficientData State = "INSUFFICIENT_DATA"
	StateDisabled         State = "DISABLED"
)

// Source is what a ClickStack alert watches.
type Source string

const (
	SourceSavedSearch Source = "saved_search"
	// SourceTile is the source of the alerts watching a tile of a dashboard.
	SourceTile Source = "tile"
	// SourceInline is the source of the alerts watching their own chart.
	SourceInline Source = "inline"
)

type PluginSpec struct {
	Datasource *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	States     []State              `json:"states,omitempty" yaml:"states,omitempty"`
	Sources    []Source             `json:"sources,omitempty" yaml:"sources,omitempty"`
	Tags       []string             `json:"tags,omitempty" yaml:"tags,omitempty"`
	Search     string               `json:"search,omitempty" yaml:"search,omitempty"`
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

// AlertsQuery lists the alerts of ClickStack. Without options, it lists the firing and pending ones.
func AlertsQuery(options ...Option) query.Option {
	plg, err := create(options...)
	return query.Option{
		Kind: plugin.KindAlertsQuery,
		Plugin: plugin.Plugin{
			Kind: PluginKind,
			Spec: plg,
		},
		Error: err,
	}
}
