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

package query

import "github.com/perses/plugins/pyroscope/sdk/go/datasource"

func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		builder.Datasource = datasource.Selector(datasourceName)
		return nil
	}
}

func MaxNodes(max int) Option {
	return func(builder *Builder) error {
		builder.MaxNodes = &max
		return nil
	}
}

func ProfileType(profileType string) Option {
	return func(builder *Builder) error {
		builder.ProfileType = profileType
		return nil
	}
}

func Filters(filters []LabelFilter) Option {
	return func(builder *Builder) error {
		builder.Filters = filters
		return nil
	}
}

func Service(service string) Option {
	return func(builder *Builder) error {
		builder.Service = &service
		return nil
	}
}
