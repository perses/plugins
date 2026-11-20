# Azure Resource Graph KQL Variable Go SDK

## Constructor

```golang
import resourcegraphkqlvariable "github.com/perses/plugins/azure/sdk/go/variable/azure-resource-graph-kql-variable"

var options []resourcegraphkqlvariable.Option
resourcegraphkqlvariable.AzureResourceGraphKql("Resources | project name, type", "name", options...)
```

Need to provide the KQL expression, the name of the column used as the option value, and a list of options.

## Default options

- [KqlQuery()](#kqlquery): with the expression provided in the constructor.
- [ValueColumnName()](#valuecolumnname): with the column name provided in the constructor.

## Available options

#### KqlQuery

```golang
import resourcegraphkqlvariable "github.com/perses/plugins/azure/sdk/go/variable/azure-resource-graph-kql-variable"

resourcegraphkqlvariable.KqlQuery("Resources | project name, type")
```

Define the KQL expression executed against Azure Resource Graph.

#### Subscriptions

```golang
import resourcegraphkqlvariable "github.com/perses/plugins/azure/sdk/go/variable/azure-resource-graph-kql-variable"

resourcegraphkqlvariable.Subscriptions("00000000-0000-0000-0000-000000000000")
```

Define the subscription UUIDs to scope the query to. If `Subscriptions` and `ManagementGroups` are not provided, Azure will default to all subscriptions the user can access.

#### ManagementGroups

```golang
import resourcegraphkqlvariable "github.com/perses/plugins/azure/sdk/go/variable/azure-resource-graph-kql-variable"

resourcegraphkqlvariable.ManagementGroups("my-management-group")
```

Define the management groups to scope the query to. If `Subscriptions` and `ManagementGroups` are not provided, Azure will default to all subscriptions the user can access.

#### LabelColumnName

```golang
import resourcegraphkqlvariable "github.com/perses/plugins/azure/sdk/go/variable/azure-resource-graph-kql-variable"

resourcegraphkqlvariable.LabelColumnName("label")
```

Define the column of the result used as the displayed label of each option. If not provided, uses the same value as the `ValueColumnName`

#### ValueColumnName

```golang
import resourcegraphkqlvariable "github.com/perses/plugins/azure/sdk/go/variable/azure-resource-graph-kql-variable"

resourcegraphkqlvariable.ValueColumnName("value")
```

Define the column of the result used as the value of each option.

#### Datasource

```golang
import resourcegraphkqlvariable "github.com/perses/plugins/azure/sdk/go/variable/azure-resource-graph-kql-variable"

resourcegraphkqlvariable.Datasource("azureResourceManager")
```

Define the `AzureResourceManagerDatasource` the variable will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"
	resourcegraphkqlvariable "github.com/perses/plugins/azure/sdk/go/variable/azure-resource-graph-kql-variable"
)

func main() {
	dashboard.New("Azure Dashboard",
		dashboard.AddVariable("resourceName",
			listvariable.List(
				resourcegraphkqlvariable.AzureResourceGraphKql("Resources | project name, type", "type",
					resourcegraphkqlvariable.LabelColumnName("name"),
					resourcegraphkqlvariable.Datasource("azureResourceManager"),
				),
				listvariable.DisplayName("Resource"),
			),
		),
	)
}
```
