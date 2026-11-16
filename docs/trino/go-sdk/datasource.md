# Trino Datasource Go SDK

## Constructor

```golang
import "github.com/perses/plugins/trino/sdk/go/datasource"

var options []datasource.Option
datasource.Trino(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/plugins/trino/sdk/go/datasource"

datasource.DirectURL("http://trino.example.com:8080")
```

Configure the access to the Trino datasource with a direct URL.

#### Proxy

```golang
import "github.com/perses/plugins/trino/sdk/go/datasource"

datasource.HTTPProxy("https://trino.example.com", httpProxyOptions...)
```

Configure the access to the Trino datasource with a proxy URL. More info at
[HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy). See the [data model](../model.md#trinodatasource)
for the endpoints and headers the proxy must allow.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/http"

	trinoDs "github.com/perses/plugins/trino/sdk/go/datasource"
)

func main() {
	dashboard.New("Trino Dashboard",
		dashboard.AddDatasource("trinoMain", trinoDs.Trino(
			trinoDs.HTTPProxy("https://trino.example.com",
				http.AddAllowedEndpoint("POST", "/v1/statement"),
				http.AddAllowedEndpoint("GET", "/v1/statement/.*"),
				http.AddAllowedEndpoint("DELETE", "/v1/statement/.*"),
				http.AddHeader("X-Trino-User", "perses"),
				http.Secret("trino_secret_config"),
			),
		)),
	)
}
```
