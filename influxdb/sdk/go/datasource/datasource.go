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

package datasource

import (
	"encoding/json"
	"fmt"

	"github.com/perses/perses/go-sdk/datasource"
	"github.com/perses/perses/pkg/model/api/v1/datasource/http"
)

const (
	PluginKindV1 = "InfluxDBV1Datasource"
	PluginKindV3 = "InfluxDBV3Datasource"
)

// InfluxDBVersion represents the InfluxDB version
type InfluxDBVersion string

const (
	VersionV1 InfluxDBVersion = "v1"
	VersionV3 InfluxDBVersion = "v3"
)

type PluginSpec struct {
	DirectURL string          `json:"directUrl,omitempty" yaml:"directUrl,omitempty"`
	Proxy     *http.Proxy     `json:"proxy,omitempty" yaml:"proxy,omitempty"`
	Version   InfluxDBVersion `json:"version" yaml:"version"`
	// V1.8 specific fields
	Database string `json:"database,omitempty" yaml:"database,omitempty"`
	// V3 specific fields
	Organization string `json:"organization,omitempty" yaml:"organization,omitempty"`
	Bucket       string `json:"bucket,omitempty" yaml:"bucket,omitempty"`
}

func (s *PluginSpec) UnmarshalJSON(data []byte) error {
	type plain PluginSpec
	var tmp PluginSpec
	if err := json.Unmarshal(data, (*plain)(&tmp)); err != nil {
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
	if err := (&tmp).validate(); err != nil {
		return err
	}
	*s = tmp
	return nil
}

func (s *PluginSpec) validate() error {
	if len(s.DirectURL) == 0 && s.Proxy == nil {
		return fmt.Errorf("directUrl or proxy cannot be empty")
	}
	if len(s.DirectURL) > 0 && s.Proxy != nil {
		return fmt.Errorf("at most directUrl or proxy must be configured")
	}
	if s.Version != VersionV1 && s.Version != VersionV3 {
		return fmt.Errorf("version must be either 'v1' or 'v3'")
	}
	if s.Version == VersionV1 && len(s.Database) == 0 {
		return fmt.Errorf("database is required for InfluxDB v1.8")
	}
	if s.Version == VersionV3 {
		if len(s.Organization) == 0 {
			return fmt.Errorf("organization is required for InfluxDB v3")
		}
		if len(s.Bucket) == 0 {
			return fmt.Errorf("bucket is required for InfluxDB v3")
		}
	}
	return nil
}

type Option func(plugin *Builder) error

func create(options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	var defaults []Option

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

func InfluxDBV1(options ...Option) datasource.Option {
	return func(builder *datasource.Builder) error {
		plugin, err := create(options...)
		if err != nil {
			return err
		}

		builder.Spec.Plugin.Kind = PluginKindV1
		builder.Spec.Plugin.Spec = plugin.PluginSpec
		return nil
	}
}

func InfluxDBV3(options ...Option) datasource.Option {
	return func(builder *datasource.Builder) error {
		plugin, err := create(options...)
		if err != nil {
			return err
		}

		builder.Spec.Plugin.Kind = PluginKindV3
		builder.Spec.Plugin.Spec = plugin.PluginSpec
		return nil
	}
}

func SelectorV1(datasourceName string) *datasource.Selector {
	return &datasource.Selector{
		Kind: PluginKindV1,
		Name: datasourceName,
	}
}

func SelectorV3(datasourceName string) *datasource.Selector {
	return &datasource.Selector{
		Kind: PluginKindV3,
		Name: datasourceName,
	}
}
