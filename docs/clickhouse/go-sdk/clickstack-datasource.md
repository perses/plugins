# ClickStack Datasource Go SDK

## Constructor

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/clickstack/datasource"

var options []datasource.Option
datasource.ClickStack(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/clickstack/datasource"

datasource.DirectURL("http://clickstack.example.com:8000")
```

Configure the access to the API of ClickStack with a direct URL. ClickStack only accepts the requests of the browsers of its own UI: prefer a proxy.

#### Proxy

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/clickstack/datasource"

datasource.HTTPProxy("http://clickstack.example.com:8000", httpProxyOptions...)
```

Configure the access to the API of ClickStack with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy). The secret of the proxy holds the API key of ClickStack as a bearer token.

#### UI URL

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/clickstack/datasource"

datasource.UIURL("https://clickstack.example.com")
```

Define the URL of the ClickStack UI, as users open it in their browser. The alerts link to it.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/http"

	csDs "github.com/perses/plugins/clickhouse/sdk/go/clickstack/datasource"
)

func main() {
	dashboard.New("ClickStack Dashboard",
		dashboard.AddDatasource("clickstack", csDs.ClickStack(
			csDs.UIURL("https://clickstack.example.com"),
			csDs.HTTPProxy("http://clickstack.example.com:8000",
				http.AddAllowedEndpoint("GET", "^/api/v2/alerts$"),
				http.AddAllowedEndpoint("GET", "^/api/v2$"),
				http.Secret("clickstack_api_key"),
			),
		)),
	)
}
```
