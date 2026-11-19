// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package metricsbatchquery

import (
	regionalMetricsDatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-regional-metrics-datasource"
)

func SubscriptionID(subscriptionID string) Option {
	return func(builder *Builder) error {
		builder.SubscriptionID = subscriptionID
		return nil
	}
}

func ResourceIDs(resourceIDs ...string) Option {
	return func(builder *Builder) error {
		builder.ResourceIDs = resourceIDs
		return nil
	}
}

func MetricNamespace(namespace string) Option {
	return func(builder *Builder) error {
		builder.MetricNamespace = namespace
		return nil
	}
}

func MetricNames(names ...string) Option {
	return func(builder *Builder) error {
		builder.MetricNames = names
		return nil
	}
}

func AddMetricName(name string) Option {
	return func(builder *Builder) error {
		builder.MetricNames = append(builder.MetricNames, name)
		return nil
	}
}

func Aggregation(aggregations ...AggregationType) Option {
	return func(builder *Builder) error {
		builder.Aggregation = aggregations
		return nil
	}
}

func Filter(filter string) Option {
	return func(builder *Builder) error {
		builder.Filter = filter
		return nil
	}
}

// Interval is an ISO8601 duration (e.g. "PT1M")
// The only interval well supported for metrics is a 1 minute interval (PT1M), shorter or longer
// intervals *may* be supported based on the metric (not well documented except in API error responses).
// Some intervals likely to be supported are: PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H, P1D
func Interval(interval string) Option {
	return func(builder *Builder) error {
		builder.Interval = interval
		return nil
	}
}

func SinglePoint(singlePoint bool) Option {
	return func(builder *Builder) error {
		builder.SinglePoint = &singlePoint
		return nil
	}
}

func FlattenMetrics(flattenMetrics bool) Option {
	return func(builder *Builder) error {
		builder.FlattenMetrics = &flattenMetrics
		return nil
	}
}

func Top(top int) Option {
	return func(builder *Builder) error {
		builder.Top = &top
		return nil
	}
}

func OrderBy(orderBy string) Option {
	return func(builder *Builder) error {
		builder.OrderBy = orderBy
		return nil
	}
}

func RollupBy(rollupBy string) Option {
	return func(builder *Builder) error {
		builder.RollupBy = rollupBy
		return nil
	}
}

func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		sel, err := regionalMetricsDatasource.Selector(datasourceName)
		if err != nil {
			return err
		}
		builder.Datasource = sel
		return nil
	}
}
