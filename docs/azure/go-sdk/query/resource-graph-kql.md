# Azure Resource Graph KQL Query Go SDK

## Constructor

```golang
import resourcegraphkqlquery "github.com/perses/plugins/azure/sdk/go/query/azure-resource-graph-kql-query"

var options []resourcegraphkqlquery.Option
resourcegraphkqlquery.AzureResourceGraphKql("Resources | project name, type", options...)
```

Need to provide the KQL expression and a list of options.

## Default options

- [KqlQuery()](#kqlquery): with the expression provided in the constructor.

## Available options

#### KqlQuery

```golang
import resourcegraphkqlquery "github.com/perses/plugins/azure/sdk/go/query/azure-resource-graph-kql-query"

resourcegraphkqlquery.KqlQuery("Resources | project name, type")
```

Define the KQL expression executed against Azure Resource Graph.
Supports [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).

#### Subscriptions

```golang
import resourcegraphkqlquery "github.com/perses/plugins/azure/sdk/go/query/azure-resource-graph-kql-query"

resourcegraphkqlquery.Subscriptions("00000000-0000-0000-0000-000000000000")
```

Define the subscription UUIDs to scope the query to. If `Subscriptions` and `ManagementGroups` are not provided, Azure will default to all subscriptions the user can access.
Supports [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).
Variables containing multiple values **must** use CSV format (e.g. `${myvariable:csv}) to be split and parsed correctly.

#### ManagementGroups

```golang
import resourcegraphkqlquery "github.com/perses/plugins/azure/sdk/go/query/azure-resource-graph-kql-query"

resourcegraphkqlquery.ManagementGroups("my-management-group")
```

Define the management groups to scope the query to. If `Subscriptions` and `ManagementGroups` are not provided, Azure will default to all subscriptions the user can access.
Supports [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).
Variables containing multiple values **must** use CSV format (e.g. `${myvariable:csv}) to be split and parsed correctly.

#### Datasource

```golang
import resourcegraphkqlquery "github.com/perses/plugins/azure/sdk/go/query/azure-resource-graph-kql-query"

resourcegraphkqlquery.Datasource("azureResourceManager")
```

Define the `AzureResourceManagerDatasource` the query will use.
Supports [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	resourcegraphkqlquery "github.com/perses/plugins/azure/sdk/go/query/azure-resource-graph-kql-query"
	table "github.com/perses/plugins/table/sdk/go"
)

func main() {
	dashboard.New("Azure Dashboard",
		dashboard.AddPanelGroup("Inventory",
			panelgroup.AddPanel("Resources",
				table.Table(),
				panel.AddQuery(
					resourcegraphkqlquery.AzureResourceGraphKql("Resources | project name, type",
						resourcegraphkqlquery.Subscriptions("00000000-0000-0000-0000-000000000000"),
						resourcegraphkqlquery.Datasource("azureResourceManager"),
					),
				),
			),
		),
	)
}
```
