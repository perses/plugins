# Prometheus Datasource Go SDK

## Constructor

```golang
import "github.com/perses/plugins/prometheus/sdk/go/datasource"

var options []datasource.Option
datasource.Prometheus(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/plugins/prometheus/sdk/go/datasource"

datasource.DirectURL("https://prometheus.demo.do.prometheus.io")
```

Configure the access to the Prometheus datasource with a direct URL.

#### Proxy

```golang
import "github.com/perses/plugins/prometheus/sdk/go/datasource"

datasource.HTTPProxy("https://current-domain-name.io", httpProxyOptions...)
```

Configure the access to the Prometheus datasource with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

#### Query Parameters

```golang
import "github.com/perses/plugins/prometheus/sdk/go/datasource"

// Add multiple query parameters at once
datasource.QueryParams(map[string]string{
    "dedup": "false",
    "max_source_resolution": "0s",
})

// Or add individual query parameters
datasource.QueryParam("dedup", "false")
datasource.QueryParam("max_source_resolution", "0s")
```

Configure query parameters to be appended to all Prometheus API requests. This is useful for:
- Thanos deduplication control (`dedup=false`)
- Resolution control (`max_source_resolution=0s`)
- Any custom query parameters required by your Prometheus setup

## Examples

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	
	promDs "github.com/perses/plugins/prometheus/sdk/go/datasource"
)

func main() {
	dashboard.New("Example Dashboard",
		dashboard.AddDatasource("prometheusDemo", 
			promDs.Prometheus(
				promDs.DirectURL("https://prometheus.demo.do.prometheus.io/")
			),
		),
	)
}
```

Another example that makes use of http query params for a Thanos setup:

```golang
func main() {
	// Example 1: Using QueryParams for multiple parameters
	dashboard.New("Example Dashboard",
		dashboard.AddDatasource("thanosQuery", 
			promDs.Prometheus(
				promDs.DirectURL("https://thanos-query.example.com/"),
				promDs.QueryParams(map[string]string{
					"dedup":                 "false",
					"max_source_resolution": "0s",
					"partial_response":      "true",
				}),
			),
		),
	)
}
```
