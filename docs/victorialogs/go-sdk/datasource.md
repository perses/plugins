# VictoriaLogs Datasource Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/datasource"

var options []datasource.Option
datasource.VictoriaLogs(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/datasource"

datasource.DirectURL("http://victorialogs.example.com:9428")
```

Configure the access to the VictoriaLogs datasource with a direct URL.

#### Proxy

```golang
import "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/datasource"

datasource.HTTPProxy("https://current-domain-name.io", httpProxyOptions...)
```

Configure the access to the VictoriaLogs datasource with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	
	vlDs "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/datasource"
)

func main() {
	dashboard.New("VictoriaLogs Dashboard",
		dashboard.AddDatasource("victoriaLogsMain", vlDs.VictoriaLogs(vlDs.DirectURL("http://victorialogs.example.com:9428"))),
	)
}
```
