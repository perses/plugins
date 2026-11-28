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

package jsonquery

import (
	trinoDatasource "github.com/perses/plugins/trino/sdk/go/datasource"
)

// Query sets the SQL query.
func Query(expr string) Option {
	return func(builder *Builder) error {
		builder.Query = expr
		return nil
	}
}

// Datasource selects the Trino datasource by name.
func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		sel, err := trinoDatasource.Selector(datasourceName)
		if err != nil {
			return err
		}
		builder.Datasource = sel
		return nil
	}
}

// Catalog sets the catalog sent as X-Trino-Catalog.
func Catalog(catalog string) Option {
	return func(builder *Builder) error {
		builder.Catalog = catalog
		return nil
	}
}

// Schema sets the schema sent as X-Trino-Schema.
func Schema(schema string) Option {
	return func(builder *Builder) error {
		builder.Schema = schema
		return nil
	}
}

// SessionProperties sets comma-separated Trino session property name=value pairs.
func SessionProperties(properties string) Option {
	return func(builder *Builder) error {
		builder.SessionProperties = properties
		return nil
	}
}

// Source sets the source label sent as X-Trino-Source.
func Source(source string) Option {
	return func(builder *Builder) error {
		builder.Source = source
		return nil
	}
}

// RoutingGroup sets the routing group sent as X-Trino-Routing-Group.
func RoutingGroup(routingGroup string) Option {
	return func(builder *Builder) error {
		builder.RoutingGroup = routingGroup
		return nil
	}
}
