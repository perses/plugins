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

package timeseries

import (
	"time"

	clickhouseDatasource "github.com/perses/plugins/clickhouse/sdk/go/datasource"
	"github.com/perses/spec/go/common"
)

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

// SeriesNameFormat sets the format of the names of the series, e.g. "{{ServiceName}}": each "{{label}}" is
// replaced by the value of the label of the series.
func SeriesNameFormat(format string) Option {
	return func(builder *Builder) error {
		builder.SeriesNameFormat = format
		return nil
	}
}

// ExemplarQuery sets the query returning the exemplars of the series: a time column, a "value" column, the label
// columns of the series, and the labels of the exemplars, such as "trace_id".
func ExemplarQuery(expr string) Option {
	return func(builder *Builder) error {
		builder.ExemplarQuery = expr
		return nil
	}
}

// MinStep sets the lower bound of the interval of the query, which is the value of the "$__interval_s" family of
// macros: typically the interval the data is written at, when a panel asks for a shorter one.
func MinStep(step time.Duration) Option {
	return func(builder *Builder) error {
		builder.MinStep = common.Duration(step)
		return nil
	}
}
