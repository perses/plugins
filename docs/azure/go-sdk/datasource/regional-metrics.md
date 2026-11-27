# Azure Regional Metrics Datasource Go SDK

## Constructor

```golang
import regionalmetricsdatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-regional-metrics-datasource"

var options []regionalmetricsdatasource.Option
regionalmetricsdatasource.AzureRegionalMetrics(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import regionalmetricsdatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-regional-metrics-datasource"

regionalmetricsdatasource.DirectURL("https://eastus.metrics.monitor.azure.com")
```

Configure the access to the Azure Monitor regional endpoint with a direct URL. Note: Since Azure generally requires credentials to access anything, it may be more appropriate to instead use proxy configuration with a secret.

#### Proxy

```golang
import regionalmetricsdatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-regional-metrics-datasource"

regionalmetricsdatasource.HTTPProxy("https://eastus.metrics.monitor.azure.com", httpProxyOptions...)
```

Configure the access to the Azure Monitor regional endpoint with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

#### MaxRequestsPerQuery

```golang
import regionalmetricsdatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-regional-metrics-datasource"

regionalmetricsdatasource.MaxRequestsPerQuery(20)
```

Caps how many batched requests are issued to fetch metrics for all the resources of a query.
Each request can batch metrics for up to 50 resources.
Once hitting the request cap, further resources are ignored (i.e. only `maxRequestsPerQuery * 50` resources are fetched).
Defaults to 20 (1000 resources).

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"

	regionalmetricsdatasource "github.com/perses/plugins/azure/sdk/go/datasource/azure-regional-metrics-datasource"
)

func main() {
	dashboard.New("Azure Dashboard",
		dashboard.AddDatasource("eastus", regionalmetricsdatasource.AzureRegionalMetrics(
			regionalmetricsdatasource.DirectURL("https://eastus.metrics.monitor.azure.com"),
		)),
	)
}
```
