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

package log

import (
	"encoding/json"
	"fmt"

	"github.com/perses/perses/go-sdk/datasource"
	"github.com/perses/perses/go-sdk/query"
	"github.com/perses/spec/go/plugin"
)

const PluginKind = "OpenSearchLogQuery"

type PluginSpec struct {
	Datasource        *datasource.Selector `json:"datasource,omitempty" yaml:"datasource,omitempty"`
	Query             string               `json:"query" yaml:"query"`
	QueryLanguage     string               `json:"queryLanguage,omitempty" yaml:"queryLanguage,omitempty"`
	Limit             int                  `json:"limit,omitempty" yaml:"limit,omitempty"`
	Index             string               `json:"index,omitempty" yaml:"index,omitempty"`
	TimestampField    string               `json:"timestampField,omitempty" yaml:"timestampField,omitempty"`
	MessageField      string               `json:"messageField,omitempty" yaml:"messageField,omitempty"`
	DisableTimeFilter bool                 `json:"disableTimeFilter,omitempty" yaml:"disableTimeFilter,omitempty"`
}

// limitPresence is decoded alongside PluginSpec to tell an explicit `limit: 0` apart from an
// omitted limit, which both leave the bare-int PluginSpec.Limit at 0.
type limitPresence struct {
	Limit *int `json:"limit" yaml:"limit"`
}

// MaxLimit is the largest `limit` accepted: `_search` rejects a `size` above the index's
// max_result_window, which defaults to 10,000.
const MaxLimit = 10000

func (l limitPresence) validate() error {
	if l.Limit != nil && *l.Limit <= 0 {
		return fmt.Errorf("limit must be greater than 0, got %d", *l.Limit)
	}
	return nil
}

func (s *PluginSpec) UnmarshalJSON(data []byte) error {
	type plain PluginSpec
	var tmp PluginSpec
	if err := json.Unmarshal(data, (*plain)(&tmp)); err != nil {
		return err
	}
	var limit limitPresence
	if err := json.Unmarshal(data, &limit); err != nil {
		return err
	}
	if err := limit.validate(); err != nil {
		return err
	}
	if err := (&tmp).validate(); err != nil {
		return err
	}
	*s = tmp
	return nil
}

func (s *PluginSpec) UnmarshalYAML(unmarshal func(interface{}) error) error {
	var tmp PluginSpec
	type plain PluginSpec
	if err := unmarshal((*plain)(&tmp)); err != nil {
		return err
	}
	var limit limitPresence
	if err := unmarshal(&limit); err != nil {
		return err
	}
	if err := limit.validate(); err != nil {
		return err
	}
	if err := (&tmp).validate(); err != nil {
		return err
	}
	*s = tmp
	return nil
}

// validLanguages mirrors the CUE schema. An empty value means PPL.
var validLanguages = map[string]bool{"": true, "ppl": true, "sql": true, "lucene": true, "dsl": true}

func (s *PluginSpec) validate() error {
	if !validLanguages[s.QueryLanguage] {
		return fmt.Errorf("unknown query language %q: want one of ppl, sql, lucene, dsl", s.QueryLanguage)
	}
	// A blank Lucene query string means "everything in the time range".
	if len(s.Query) == 0 && s.QueryLanguage != "lucene" {
		return fmt.Errorf("query cannot be empty")
	}
	if (s.QueryLanguage == "lucene" || s.QueryLanguage == "dsl") && len(s.Index) == 0 {
		return fmt.Errorf("index is required when queryLanguage is %q", s.QueryLanguage)
	}
	// Only negative values are rejected here: with a bare int + omitempty, an omitted
	// `limit` is also 0, so rejecting 0 would reject every spec that simply omits the
	// field. An explicit zero is caught while unmarshalling, via limitPresence.
	if s.Limit < 0 {
		return fmt.Errorf("limit cannot be negative")
	}
	if s.Limit > MaxLimit {
		return fmt.Errorf("limit must be at most %d, got %d", MaxLimit, s.Limit)
	}
	return nil
}

type Option func(plugin *Builder) error

func create(query string, options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		Query(query),
	}

	for _, opt := range append(defaults, options...) {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	if err := builder.validate(); err != nil {
		return *builder, err
	}

	return *builder, nil
}

type Builder struct {
	PluginSpec `json:",inline" yaml:",inline"`
}

func OpenSearchLogQuery(expr string, options ...Option) query.Option {
	plg, err := create(expr, options...)
	return query.Option{
		Kind: plugin.KindLogQuery,
		Plugin: plugin.Plugin{
			Kind: PluginKind,
			Spec: plg,
		},
		Error: err,
	}
}
