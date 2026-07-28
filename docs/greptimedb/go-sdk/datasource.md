# GreptimeDB Datasource Go SDK

## Constructor

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/datasource"

var options []datasource.Option
datasource.GreptimeDB(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/datasource"

datasource.DirectURL("http://localhost:4000")
```

Configure the access to the GreptimeDB datasource with a direct URL.

#### Proxy

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/datasource"

datasource.HTTPProxy("https://current-domain-name.io", httpProxyOptions...)
```

Configure the access to the GreptimeDB datasource with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"

	gtDs "github.com/perses/plugins/greptimedb/sdk/go/datasource"
)

func main() {
	dashboard.New("GreptimeDB Dashboard",
		dashboard.AddDatasource("greptimeMain", gtDs.GreptimeDB(gtDs.DirectURL("http://localhost:4000"))),
	)
}
```
