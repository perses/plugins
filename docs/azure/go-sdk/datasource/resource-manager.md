# Azure Resource Manager Datasource Go SDK

## Constructor

```golang
import resourcemanagerdatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-resource-manager-datasource"

var options []resourcemanagerdatasource.Option
resourcemanagerdatasource.AzureResourceManager(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import resourcemanagerdatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-resource-manager-datasource"

resourcemanagerdatasource.DirectURL("https://management.azure.com")
```

Configure the access to the Azure Resource Manager endpoint with a direct URL. Note: Since Azure generally requires credentials to access anything, it may be more appropriate to instead use proxy configuration with a secret.

#### Proxy

```golang
import resourcemanagerdatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-resource-manager-datasource"

resourcemanagerdatasource.HTTPProxy("https://management.azure.com", httpProxyOptions...)
```

Configure the access to the Azure Resource Manager endpoint with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

#### MaxRequestsPerQuery

```golang
import resourcemanagerdatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-resource-manager-datasource"

resourcemanagerdatasource.MaxRequestsPerQuery(5)
```

Caps how many paginated requests are issued to collect all the results of a query. Defaults to 5 if not provided.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"

	resourcemanagerdatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-resource-manager-datasource"
)

func main() {
	dashboard.New("Azure Dashboard",
		dashboard.AddDatasource("azureResourceManager", resourcemanagerdatasource.AzureResourceManager(
			resourcemanagerdatasource.DirectURL("https://management.azure.com"),
		)),
	)
}
```
