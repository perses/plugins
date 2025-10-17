# ClickHouse Datasource Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/clickhouse/sdk/go/v1/datasource"

var options []datasource.Option
datasource.ClickHouse(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/perses-plugins/clickhouse/sdk/go/v1/datasource"

datasource.DirectURL("http://clickhouse.example.com:8123")
```

Configure the access to the ClickHouse datasource with a direct URL.

#### Proxy

```golang
import "github.com/perses/perses-plugins/clickhouse/sdk/go/v1/datasource"

datasource.HTTPProxy("https://current-domain-name.io", httpProxyOptions...)
```

Configure the access to the ClickHouse datasource with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	
	chDs "github.com/perses/perses-plugins/clickhouse/sdk/go/v1/datasource"
)

func main() {
	dashboard.New("ClickHouse Dashboard",
		dashboard.AddDatasource("clickhouseMain", chDs.ClickHouse(chDs.DirectURL("http://clickhouse.example.com:8123"))),
	)
}
```
