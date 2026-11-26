# ClickHouse Datasource Go SDK

## Constructor

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/datasource"

var options []datasource.Option
datasource.ClickHouse(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/datasource"

datasource.DirectURL("http://clickhouse.example.com:8123")
```

Configure the access to the ClickHouse datasource with a direct URL.

#### Proxy

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/datasource"

datasource.HTTPProxy("https://current-domain-name.io", httpProxyOptions...)
```

Configure the access to the ClickHouse datasource with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

#### Database

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/datasource"

datasource.Database("otel")
```

Define the database the table names without a database are read from. By default, it is the database named `default`.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/http"

	chDs "github.com/perses/plugins/clickhouse/sdk/go/datasource"
)

func main() {
	dashboard.New("ClickHouse Dashboard",
		dashboard.AddDatasource("clickhouseMain", chDs.ClickHouse(
			chDs.Database("otel"),
			chDs.HTTPProxy("http://clickhouse.example.com:8123",
				http.AddAllowedEndpoint("POST", "^/$"),
				http.AddAllowedEndpoint("GET", "^/ping$"),
				http.Secret("clickhouse_secret_config"),
			),
		)),
	)
}
```
