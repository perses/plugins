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

package resourcegraphkqlvariable

import (
	resourceManagerDatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-resource-manager-datasource"
)

func KqlQuery(kqlQuery string) Option {
	return func(builder *Builder) error {
		builder.KqlQuery = kqlQuery
		return nil
	}
}

func Subscriptions(subscriptions ...string) Option {
	return func(builder *Builder) error {
		builder.Subscriptions = subscriptions
		return nil
	}
}

func ManagementGroups(managementGroups ...string) Option {
	return func(builder *Builder) error {
		builder.ManagementGroups = managementGroups
		return nil
	}
}

func LabelColumnName(labelColumnName string) Option {
	return func(builder *Builder) error {
		builder.LabelColumnName = labelColumnName
		return nil
	}
}

func ValueColumnName(valueColumnName string) Option {
	return func(builder *Builder) error {
		builder.ValueColumnName = valueColumnName
		return nil
	}
}

func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		builder.Datasource = resourceManagerDatasource.Selector(datasourceName)
		return nil
	}
}
