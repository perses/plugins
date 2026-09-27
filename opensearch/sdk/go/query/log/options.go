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
	"fmt"

	opensearchDatasource "github.com/perses/plugins/opensearch/sdk/go/datasource"
)

func Query(expr string) Option {
	return func(builder *Builder) error {
		builder.Query = expr
		return nil
	}
}

func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		builder.Datasource = opensearchDatasource.Selector(datasourceName)
		return nil
	}
}

func Index(index string) Option {
	return func(builder *Builder) error {
		builder.Index = index
		return nil
	}
}

func TimestampField(field string) Option {
	return func(builder *Builder) error {
		builder.TimestampField = field
		return nil
	}
}

func MessageField(field string) Option {
	return func(builder *Builder) error {
		builder.MessageField = field
		return nil
	}
}

func DisableTimeFilter(disable bool) Option {
	return func(builder *Builder) error {
		builder.DisableTimeFilter = disable
		return nil
	}
}

// QueryLanguage sets the language the query is written in: "ppl" (the default when
// unset), "sql", "lucene", or "dsl". "lucene" and "dsl" also require Index.
func QueryLanguage(lang string) Option {
	return func(builder *Builder) error {
		builder.QueryLanguage = lang
		return nil
	}
}

// Limit caps the number of log documents fetched. Applies to the "lucene" and "dsl"
// languages, which map it to the _search request's `size`. Must be greater than zero:
// the CUE schema constrains `limit` to `int & >0`, and because the field is a bare int
// with omitempty, a zero would be indistinguishable from an omitted value.
func Limit(n int) Option {
	return func(builder *Builder) error {
		if n <= 0 {
			return fmt.Errorf("limit must be greater than 0, got %d", n)
		}
		builder.Limit = n
		return nil
	}
}
