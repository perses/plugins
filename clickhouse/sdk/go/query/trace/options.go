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

package trace

import (
	"fmt"
	"regexp"

	clickhouseDatasource "github.com/perses/plugins/clickhouse/sdk/go/datasource"
)

var tableName = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$`)

func Query(expr string) Option {
	return func(builder *Builder) error {
		builder.Query = expr
		return nil
	}
}

func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		sel, err := clickhouseDatasource.Selector(datasourceName)
		if err != nil {
			return err
		}
		builder.Datasource = sel
		return nil
	}
}

// Table sets the table of the spans, in the schema of the OpenTelemetry Collector: "table" or "database.table".
// It defaults to "otel_traces".
func Table(table string) Option {
	return func(builder *Builder) error {
		if !tableName.MatchString(table) {
			return fmt.Errorf("invalid trace table %q: expected \"table\" or \"database.table\"", table)
		}
		builder.Table = table
		return nil
	}
}

// Limit sets the maximum number of traces returned by a search. It defaults to 20.
func Limit(limit int) Option {
	return func(builder *Builder) error {
		if limit < 1 {
			return fmt.Errorf("invalid trace limit %d: expected a positive number", limit)
		}
		builder.Limit = &limit
		return nil
	}
}
