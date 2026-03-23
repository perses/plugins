# Pyroscope Datasource Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/datasource"

var options []datasource.Option
datasource.Pyroscope(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/datasource"

datasource.DirectURL("http://pyroscope.example.com:4040")
```

Configure the access to the Pyroscope datasource with a direct URL.

#### Proxy

```golang
import "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/datasource"

datasource.HTTPProxy("https://current-domain-name.io", httpProxyOptions...)
```

Configure the access to the Pyroscope datasource with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	
	pyroDs "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/datasource"
)

func main() {
	dashboard.New("Pyroscope Dashboard",
		dashboard.AddDatasource("pyroscopeMain", pyroDs.Pyroscope(pyroDs.DirectURL("http://pyroscope.example.com:4040"))),
	)
}
```
