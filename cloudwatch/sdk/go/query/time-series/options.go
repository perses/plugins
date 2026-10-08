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
	"fmt"

	cloudwatchDatasource "github.com/perses/plugins/cloudwatch/sdk/go/datasource"
)

func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		builder.Datasource = cloudwatchDatasource.Selector(datasourceName)
		return nil
	}
}

// Metric adds a query returning a CloudWatch metric.
func Metric(id string, metric MetricStat) Option {
	return func(builder *Builder) error {
		if metric.Period < 60 || metric.Period%60 != 0 {
			return fmt.Errorf("the period of query %q must be a multiple of 60 seconds", id)
		}
		builder.Queries = append(builder.Queries, Query{ID: id, Metric: &metric})
		return nil
	}
}

// Expression adds a metric math query, referencing the other queries by ID.
func Expression(id string, expression string) Option {
	return func(builder *Builder) error {
		builder.Queries = append(builder.Queries, Query{ID: id, Expression: expression})
		return nil
	}
}

// Label sets the legend of the last added query.
func Label(label string) Option {
	return func(builder *Builder) error {
		if len(builder.Queries) == 0 {
			return fmt.Errorf("add a query before setting its label")
		}
		builder.Queries[len(builder.Queries)-1].Label = label
		return nil
	}
}

// Hidden hides the series of the last added query, for example when it is only used by an expression.
func Hidden() Option {
	return func(builder *Builder) error {
		if len(builder.Queries) == 0 {
			return fmt.Errorf("add a query before hiding it")
		}
		returnData := false
		builder.Queries[len(builder.Queries)-1].ReturnData = &returnData
		return nil
	}
}
